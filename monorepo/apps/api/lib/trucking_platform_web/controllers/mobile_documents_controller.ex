defmodule TruckingPlatformWeb.MobileDocumentsController do
  use TruckingPlatformWeb, :controller
  alias TruckingPlatform.Storage.{Document, DocumentSignature}
  alias TruckingPlatformWeb.Endpoint

  # Get documents for mobile view
  def index(conn, %{"userId" => user_id, "orgId" => org_id} = params) do
    status_filter = params["status"] # "pending", "signed", "all"
    trip_id = params["tripId"]
    
    case Document.list_for_user(user_id, org_id, status: status_filter, trip_id: trip_id) do
      {:ok, documents} ->
        mobile_documents = Enum.map(documents, &format_document_for_mobile/1)
        json(conn, %{documents: mobile_documents})
      
      {:error, reason} ->
        conn
        |> put_status(500)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get single document for mobile viewer
  def show(conn, %{"id" => doc_id, "userId" => user_id}) do
    case Document.get_for_user(doc_id, user_id) do
      {:ok, document} ->
        # Enhanced document data for mobile viewer
        enhanced_doc = enhance_document_for_mobile(document, user_id)
        json(conn, enhanced_doc)
      
      {:error, :not_found} ->
        conn
        |> put_status(404)
        |> json(%{error: "Document not found"})
      
      {:error, reason} ->
        conn
        |> put_status(500)
        |> json(%{error: inspect(reason)})
    end
  end

  # Sign document with mobile signature
  def sign(conn, %{"id" => doc_id} = params) do
    with {:ok, attrs} <- validate_mobile_signature(params),
         {:ok, signature} <- DocumentSignature.create(attrs),
         {:ok, updated_doc} <- Document.mark_signed(doc_id, signature.id) do
      
      # Broadcast signature completion
      broadcast_document_signed(updated_doc, signature)
      
      # Send notification
      send_signature_notification(updated_doc, signature)
      
      # Create audit trail
      create_signature_audit_trail(updated_doc, signature, attrs)
      
      json(conn, %{
        success: true,
        document: format_document_for_mobile(updated_doc),
        signature: format_signature_for_mobile(signature),
        audit_trail: create_audit_summary(signature, attrs)
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Upload signature image
  def upload_signature(conn, %{"signature_data" => signature_data} = params) do
    with {:ok, attrs} <- validate_signature_upload(params),
         {:ok, upload_result} <- upload_signature_image(signature_data, attrs) do
      
      json(conn, %{
        success: true,
        signature_url: upload_result.url,
        signature_id: upload_result.id
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get document download URL
  def download_url(conn, %{"id" => doc_id, "userId" => user_id}) do
    case Document.get_for_user(doc_id, user_id) do
      {:ok, document} ->
        case generate_secure_download_url(document) do
          {:ok, url} ->
            json(conn, %{
              download_url: url,
              expires_at: DateTime.add(DateTime.utc_now(), 3600), # 1 hour
              content_type: document.content_type || "application/pdf"
            })
          
          {:error, reason} ->
            conn
            |> put_status(500)
            |> json(%{error: inspect(reason)})
        end
      
      {:error, reason} ->
        conn
        |> put_status(404)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get signature fields for document
  def signature_fields(conn, %{"id" => doc_id, "userId" => user_id}) do
    case Document.get_for_user(doc_id, user_id) do
      {:ok, document} ->
        fields = extract_signature_fields(document)
        json(conn, %{
          document_id: doc_id,
          signature_fields: fields,
          total_fields: length(fields)
        })
      
      {:error, reason} ->
        conn
        |> put_status(404)
        |> json(%{error: inspect(reason)})
    end
  end

  # Batch sign multiple documents
  def batch_sign(conn, %{"signatures" => signatures} = params) do
    with {:ok, attrs} <- validate_batch_signatures(params),
         {:ok, results} <- process_batch_signatures(signatures, attrs) do
      
      # Broadcast batch completion
      broadcast_batch_signing_complete(results, attrs)
      
      json(conn, %{
        success: true,
        signed_count: length(results.successful),
        failed_count: length(results.failed),
        successful: results.successful,
        failed: results.failed
      })
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> json(%{error: inspect(reason)})
    end
  end

  # Get audit trail for document
  def audit_trail(conn, %{"id" => doc_id, "userId" => user_id}) do
    case Document.get_for_user(doc_id, user_id) do
      {:ok, document} ->
        case DocumentSignature.get_audit_trail(doc_id) do
          {:ok, trail} ->
            json(conn, %{
              document_id: doc_id,
              audit_trail: Enum.map(trail, &format_audit_entry/1)
            })
          
          {:error, reason} ->
            conn
            |> put_status(500)
            |> json(%{error: inspect(reason)})
        end
      
      {:error, reason} ->
        conn
        |> put_status(404)
        |> json(%{error: inspect(reason)})
    end
  end

  # Private helper functions

  defp validate_mobile_signature(params) do
    required = ~w(user_id document_id signature_data location)
    case validate_required_fields(params, required) do
      {:ok, _} ->
        with {:ok, location} <- validate_location_data(params["location"]),
             {:ok, signature_data} <- validate_signature_data(params["signature_data"]) do
          {:ok, %{
            user_id: params["user_id"],
            document_id: params["document_id"],
            signature_data: signature_data,
            location: location,
            device_info: params["device_info"] || %{},
            timestamp: DateTime.utc_now(),
            ip_address: get_client_ip(params["conn"] || %{}),
            user_agent: get_user_agent(params["conn"] || %{})
          }}
        end
      error -> error
    end
  end

  defp validate_signature_upload(params) do
    required = ~w(user_id document_id)
    case validate_required_fields(params, required) do
      {:ok, _} -> {:ok, stringify_keys(params)}
      error -> error
    end
  end

  defp validate_batch_signatures(params) do
    case params["signatures"] do
      signatures when is_list(signatures) and length(signatures) > 0 ->
        {:ok, stringify_keys(params)}
      _ ->
        {:error, :invalid_signatures}
    end
  end

  defp validate_location_data(%{"lat" => lat, "lng" => lng, "accuracy" => accuracy, "timestamp" => timestamp}) 
    when is_number(lat) and is_number(lng) and is_number(accuracy) do
    {:ok, %{
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      timestamp: timestamp
    }}
  end
  defp validate_location_data(_), do: {:error, :invalid_location}

  defp validate_signature_data(%{"signature_svg" => svg, "field_id" => field_id}) when is_binary(svg) do
    {:ok, %{
      signature_svg: svg,
      field_id: field_id,
      signature_type: "svg"
    }}
  end
  defp validate_signature_data(%{"signature_base64" => base64, "field_id" => field_id}) when is_binary(base64) do
    {:ok, %{
      signature_base64: base64,
      field_id: field_id,
      signature_type: "image"
    }}
  end
  defp validate_signature_data(_), do: {:error, :invalid_signature_data}

  defp validate_required_fields(params, required) do
    missing = Enum.filter(required, fn field ->
      !Map.has_key?(params, field) && !Map.has_key?(params, String.to_atom(field))
    end)
    
    if missing == [], do: {:ok, params}, else: {:error, {:missing_fields, missing}}
  end

  defp format_document_for_mobile(document) do
    %{
      id: document.id,
      title: document.title || document.filename,
      filename: document.filename,
      content_type: document.content_type,
      size: document.size,
      status: document.status,
      trip_id: document.trip_id,
      created_at: document.inserted_at,
      updated_at: document.updated_at,
      signed_at: document.signed_at,
      signature_required: document.signature_required || false,
      signature_fields_count: count_signature_fields(document),
      thumbnail_url: generate_thumbnail_url(document),
      is_signable: is_document_signable?(document)
    }
  end

  defp enhance_document_for_mobile(document, user_id) do
    base_doc = format_document_for_mobile(document)
    
    signature_fields = extract_signature_fields(document)
    existing_signatures = get_existing_signatures(document.id, user_id)
    
    Map.merge(base_doc, %{
      signature_fields: signature_fields,
      existing_signatures: existing_signatures,
      pages: get_document_pages(document),
      download_url: generate_secure_download_url(document) |> elem(1),
      can_sign: can_user_sign?(document, user_id)
    })
  end

  defp extract_signature_fields(document) do
    # Extract signature fields from document metadata
    # This would be enhanced based on your PDF processing library
    document.metadata
    |> Map.get("signature_fields", [])
    |> Enum.map(fn field ->
      %{
        id: field["id"],
        page: field["page"] || 1,
        x: field["x"],
        y: field["y"],
        width: field["width"],
        height: field["height"],
        required: field["required"] || false,
        signed: field["signed"] || false,
        signer: field["signer"]
      }
    end)
  end

  defp count_signature_fields(document) do
    document.metadata
    |> Map.get("signature_fields", [])
    |> length()
  end

  defp generate_thumbnail_url(document) do
    # Generate thumbnail URL for document preview
    "/api/documents/#{document.id}/thumbnail"
  end

  defp is_document_signable?(document) do
    document.signature_required && document.status != "signed"
  end

  defp get_existing_signatures(document_id, user_id) do
    case DocumentSignature.list_by_document_and_user(document_id, user_id) do
      {:ok, signatures} ->
        Enum.map(signatures, &format_signature_for_mobile/1)
      _ ->
        []
    end
  end

  defp get_document_pages(document) do
    # Get page count and metadata
    page_count = document.metadata["page_count"] || 1
    
    1..page_count
    |> Enum.map(fn page_num ->
      %{
        page: page_num,
        preview_url: "/api/documents/#{document.id}/pages/#{page_num}/preview"
      }
    end)
  end

  defp can_user_sign?(document, user_id) do
    # Check if user is authorized to sign this document
    document.signature_required && 
    document.status != "signed" &&
    is_user_authorized_signer?(document, user_id)
  end

  defp is_user_authorized_signer?(document, user_id) do
    # Check if user is in the authorized signers list
    authorized_signers = document.metadata["authorized_signers"] || []
    Enum.member?(authorized_signers, user_id) || 
    document.created_by == user_id ||
    document.trip_driver_id == user_id
  end

  defp upload_signature_image(signature_data, attrs) do
    # Upload signature to blob storage
    case decode_signature_data(signature_data) do
      {:ok, image_binary} ->
        filename = "signature_#{attrs["user_id"]}_#{DateTime.utc_now() |> DateTime.to_unix()}.png"
        
        case TruckingPlatform.Storage.upload_blob(image_binary, filename, "image/png") do
          {:ok, url} ->
            {:ok, %{url: url, id: UUID.uuid4()}}
          error ->
            error
        end
      
      error ->
        error
    end
  end

  defp decode_signature_data("data:image/png;base64," <> base64_data) do
    case Base.decode64(base64_data) do
      {:ok, binary} -> {:ok, binary}
      :error -> {:error, :invalid_base64}
    end
  end
  defp decode_signature_data(_), do: {:error, :invalid_format}

  defp generate_secure_download_url(document) do
    # Generate a secure, time-limited download URL
    case TruckingPlatform.Storage.generate_sas_url(document.blob_path, 3600) do
      {:ok, url} -> {:ok, url}
      error -> error
    end
  end

  defp process_batch_signatures(signatures, attrs) do
    results = %{successful: [], failed: []}
    
    signatures
    |> Enum.reduce(results, fn signature_data, acc ->
      case create_single_signature(signature_data, attrs) do
        {:ok, signature} ->
          %{acc | successful: [signature | acc.successful]}
        {:error, reason} ->
          failed_item = Map.put(signature_data, :error, reason)
          %{acc | failed: [failed_item | acc.failed]}
      end
    end)
    |> then(&{:ok, &1})
  end

  defp create_single_signature(signature_data, base_attrs) do
    attrs = Map.merge(base_attrs, signature_data)
    
    with {:ok, signature} <- DocumentSignature.create(attrs),
         {:ok, _} <- Document.mark_signed(attrs["document_id"], signature.id) do
      {:ok, signature}
    end
  end

  defp format_signature_for_mobile(signature) do
    %{
      id: signature.id,
      document_id: signature.document_id,
      field_id: signature.field_id,
      signed_at: signature.inserted_at,
      signature_url: signature.signature_url,
      location: signature.location,
      device_info: signature.device_info
    }
  end

  defp format_audit_entry(entry) do
    %{
      id: entry.id,
      action: entry.action,
      user_id: entry.user_id,
      timestamp: entry.timestamp,
      location: entry.location,
      device_info: entry.device_info,
      ip_address: entry.ip_address,
      details: entry.details
    }
  end

  defp broadcast_document_signed(document, signature) do
    Endpoint.broadcast!("org:#{document.org_id}:documents", "document_signed", %{
      document_id: document.id,
      signature_id: signature.id,
      user_id: signature.user_id,
      timestamp: DateTime.utc_now()
    })
    
    if document.trip_id do
      Endpoint.broadcast!("trip:#{document.trip_id}", "document_signed", %{
        document: format_document_for_mobile(document),
        signature: format_signature_for_mobile(signature)
      })
    end
  end

  defp broadcast_batch_signing_complete(results, attrs) do
    Endpoint.broadcast!("user:#{attrs["user_id"]}", "batch_signing_complete", %{
      successful_count: length(results.successful),
      failed_count: length(results.failed),
      timestamp: DateTime.utc_now()
    })
  end

  defp send_signature_notification(document, signature) do
    notification_data = %{
      title: "Document Signed",
      body: "#{document.title || document.filename} has been signed",
      type: "document_signed",
      document_id: document.id,
      data: %{
        document_id: document.id,
        signature_id: signature.id,
        trip_id: document.trip_id
      }
    }
    
    Task.start(fn ->
      TruckingPlatform.Notifications.send_push_notification(
        document.org_id,
        ["dispatcher", "admin"],
        notification_data
      )
    end)
  end

  defp create_signature_audit_trail(document, signature, attrs) do
    audit_entry = %{
      document_id: document.id,
      signature_id: signature.id,
      user_id: signature.user_id,
      action: "document_signed",
      timestamp: signature.inserted_at,
      location: attrs.location,
      device_info: attrs.device_info,
      ip_address: attrs.ip_address,
      user_agent: attrs.user_agent,
      details: %{
        signature_method: "mobile_touch",
        field_id: signature.field_id,
        verification_hash: generate_verification_hash(signature, attrs)
      }
    }
    
    Task.start(fn ->
      TruckingPlatform.Storage.AuditLog.create(audit_entry)
    end)
  end

  defp create_audit_summary(signature, attrs) do
    %{
      signature_id: signature.id,
      timestamp: signature.inserted_at,
      location: attrs.location,
      device: attrs.device_info["model"] || "Unknown",
      verification_hash: generate_verification_hash(signature, attrs),
      legal_binding: true
    }
  end

  defp generate_verification_hash(signature, attrs) do
    # Generate a verification hash for legal compliance
    data = "#{signature.id}#{signature.user_id}#{attrs.location["lat"]}#{attrs.location["lng"]}#{DateTime.to_unix(signature.inserted_at)}"
    :crypto.hash(:sha256, data) |> Base.encode16(case: :lower)
  end

  defp get_client_ip(conn) do
    case Plug.Conn.get_req_header(conn, "x-forwarded-for") do
      [ip | _] -> ip
      [] -> 
        case conn.remote_ip do
          {a, b, c, d} -> "#{a}.#{b}.#{c}.#{d}"
          _ -> "unknown"
        end
    end
  rescue
    _ -> "unknown"
  end

  defp get_user_agent(conn) do
    case Plug.Conn.get_req_header(conn, "user-agent") do
      [ua | _] -> ua
      [] -> "unknown"
    end
  rescue
    _ -> "unknown"
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {k, v} ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      {key, (if is_map(v), do: stringify_keys(v), else: v)}
    end)
  end
end
