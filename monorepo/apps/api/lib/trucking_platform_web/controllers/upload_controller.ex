defmodule TruckingPlatformWeb.UploadController do
  use TruckingPlatformWeb, :controller

  alias TruckingPlatform.Storage.Azure.BlobStorage

  def generate_sas(conn, params) do
    user_id = conn.assigns[:user_id]
    org_id = conn.assigns[:org_id]
    
    container = params["container"] || "uploads"
    filename = params["filename"]
    content_type = params["content_type"]
    content_length = params["content_length"]

    # Validate file constraints
    case validate_upload_request(filename, content_type, content_length, org_id) do
      :ok ->
        blob_name = generate_blob_name(org_id, user_id, filename)
        
        case BlobStorage.generate_sas_token(container, blob_name, user_id, org_id) do
          {:ok, sas_data} ->
            json(conn, %{
              upload_url: sas_data.upload_url,
              blob_name: blob_name,
              expires_at: sas_data.expires_at
            })
          
          {:error, reason} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "Failed to generate SAS token", reason: reason})
        end
      
      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: reason})
    end
  end

  def complete(conn, %{"blob_name" => blob_name, "room_id" => room_id} = params) do
    user_id = conn.assigns[:user_id]
    org_id = conn.assigns[:org_id]

    # Verify the upload was completed
    case BlobStorage.verify_upload(blob_name) do
      {:ok, blob_info} ->
        # Create message with attachment
        attachment = %{
          id: UUID.uuid4(),
          name: params["original_filename"] || blob_name,
          blob_name: blob_name,
          size: blob_info.content_length,
          content_type: blob_info.content_type,
          upload_url: BlobStorage.get_blob_url(blob_name)
        }

        message_params = %{
          room_id: room_id,
          user_id: user_id,
          org_id: org_id,
          content: "Uploaded file: #{attachment.name}",
          type: determine_message_type(blob_info.content_type),
          attachments: [attachment]
        }

        case TruckingPlatform.Storage.Message.create(message_params) do
          {:ok, message} ->
            # Broadcast to room
            TruckingPlatformWeb.Endpoint.broadcast!(
              "room:#{room_id}",
              "new_message",
              message
            )

            json(conn, %{message_id: message.id, attachment: attachment})
          
          {:error, reason} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "Failed to create message", reason: reason})
        end
      
      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Upload verification failed", reason: reason})
    end
  end

  # Private functions

  defp validate_upload_request(filename, content_type, content_length, _org_id) do
    cond do
      is_nil(filename) or filename == "" ->
        {:error, "Filename is required"}
      
      is_nil(content_type) or content_type == "" ->
        {:error, "Content type is required"}
      
      not valid_content_type?(content_type) ->
        {:error, "Content type not allowed"}
      
      is_integer(content_length) and content_length > max_file_size() ->
        {:error, "File too large"}
      
      true ->
        :ok
    end
  end

  defp valid_content_type?(content_type) do
    allowed_types = [
      # Images
      "image/jpeg", "image/png", "image/gif", "image/webp",
      # Documents
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      # Text
      "text/plain", "text/csv",
      # Archives
      "application/zip", "application/x-rar-compressed"
    ]
    
    content_type in allowed_types
  end

  defp max_file_size, do: 25 * 1024 * 1024 # 25MB

  defp generate_blob_name(org_id, user_id, filename) do
    timestamp = DateTime.utc_now() |> DateTime.to_unix()
    random = :crypto.strong_rand_bytes(8) |> Base.encode16(case: :lower)
    extension = Path.extname(filename)
    
    "#{org_id}/#{user_id}/#{timestamp}-#{random}#{extension}"
  end

  defp determine_message_type(content_type) do
    cond do
      String.starts_with?(content_type, "image/") -> "image"
      content_type == "application/pdf" -> "file"
      true -> "file"
    end
  end
end
