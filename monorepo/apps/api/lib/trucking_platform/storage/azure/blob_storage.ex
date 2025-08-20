defmodule TruckingPlatform.Storage.Azure.BlobStorage do
  @moduledoc """
  Azure Blob Storage client with SAS token generation.
  Handles file uploads, downloads, and user delegation SAS tokens.
  """

  require Logger

  @storage_account Application.compile_env(:trucking_platform, :azure_storage_account)
  @storage_key Application.compile_env(:trucking_platform, :azure_storage_key)
  @base_url "https://#{@storage_account}.blob.core.windows.net"

  def generate_sas_token(container, blob_name, user_id, org_id) do
    # Generate user delegation SAS token
    expires_at = DateTime.utc_now() |> DateTime.add(3600, :second) # 1 hour
    
    permissions = "w" # Write permission for upload
    
    sas_params = %{
      container: container,
      blob: blob_name,
      permissions: permissions,
      expiry: DateTime.to_iso8601(expires_at),
      user_id: user_id,
      org_id: org_id
    }

    case generate_user_delegation_sas(sas_params) do
      {:ok, sas_token} ->
        upload_url = "#{@base_url}/#{container}/#{blob_name}?#{sas_token}"
        
        {:ok, %{
          upload_url: upload_url,
          expires_at: expires_at,
          container: container,
          blob_name: blob_name
        }}
      
      {:error, reason} ->
        Logger.error("Failed to generate SAS token: #{inspect(reason)}")
        {:error, reason}
    end
  end

  def verify_upload(blob_name) do
    # Check if blob exists and get its properties
    container = "uploads" # Default container
    url = "#{@base_url}/#{container}/#{blob_name}"
    
    headers = [
      {"Authorization", "SharedKey #{@storage_account}:#{generate_auth_header("HEAD", container, blob_name)}"},
      {"x-ms-version", "2020-10-02"},
      {"x-ms-date", format_date(DateTime.utc_now())}
    ]

    case HTTPoison.head(url, headers) do
      {:ok, %HTTPoison.Response{status_code: 200, headers: response_headers}} ->
        content_length = get_header_value(response_headers, "content-length")
        content_type = get_header_value(response_headers, "content-type")
        
        {:ok, %{
          content_length: String.to_integer(content_length || "0"),
          content_type: content_type || "application/octet-stream"
        }}
      
      {:ok, %HTTPoison.Response{status_code: 404}} ->
        {:error, :not_found}
      
      {:ok, %HTTPoison.Response{status_code: status}} ->
        {:error, "HTTP #{status}"}
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  def get_blob_url(blob_name, container \\ "uploads") do
    "#{@base_url}/#{container}/#{blob_name}"
  end

  def delete_blob(blob_name, container \\ "uploads") do
    url = "#{@base_url}/#{container}/#{blob_name}"
    
    headers = [
      {"Authorization", "SharedKey #{@storage_account}:#{generate_auth_header("DELETE", container, blob_name)}"},
      {"x-ms-version", "2020-10-02"},
      {"x-ms-date", format_date(DateTime.utc_now())}
    ]

    case HTTPoison.delete(url, headers) do
      {:ok, %HTTPoison.Response{status_code: status}} when status in [202, 404] ->
        :ok
      
      {:ok, %HTTPoison.Response{status_code: status}} ->
        {:error, "HTTP #{status}"}
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  # Private functions

  defp generate_user_delegation_sas(params) do
    # In a real implementation, this would call Azure Storage REST API
    # to get a user delegation key and generate the SAS token
    # For now, we'll generate a simple SAS token using account key
    
    try do
      string_to_sign = build_string_to_sign(params)
      signature = sign_string(string_to_sign)
      
      sas_token = URI.encode_query(%{
        "sv" => "2020-10-02", # API version
        "st" => format_iso_date(DateTime.utc_now()),
        "se" => params.expiry,
        "sr" => "b", # Blob
        "sp" => params.permissions,
        "sig" => signature
      })
      
      {:ok, sas_token}
    rescue
      error -> {:error, error}
    end
  end

  defp build_string_to_sign(params) do
    [
      params.permissions, # signedpermissions
      format_iso_date(DateTime.utc_now()), # signedstart
      params.expiry, # signedexpiry
      "/blob/#{@storage_account}/#{params.container}/#{params.blob}", # canonicalizedresource
      "", # signedidentifier
      "", # signedIP
      "", # signedProtocol
      "2020-10-02", # signedversion
      "", # signedResource
      "", # signedSnapshotTime
      "", # signedEncryptionScope
      "", # signedCacheControl
      "", # signedContentDisposition
      "", # signedContentEncoding
      "", # signedContentLanguage
      "" # signedContentType
    ]
    |> Enum.join("\n")
  end

  defp sign_string(string_to_sign) do
    :crypto.mac(:hmac, :sha256, Base.decode64!(@storage_key), string_to_sign)
    |> Base.encode64()
  end

  defp generate_auth_header(method, container, blob_name) do
    date = format_date(DateTime.utc_now())
    
    string_to_sign = [
      method,
      "", # Content-Encoding
      "", # Content-Language
      "", # Content-Length
      "", # Content-MD5
      "", # Content-Type
      "", # Date
      "", # If-Modified-Since
      "", # If-Match
      "", # If-None-Match
      "", # If-Unmodified-Since
      "", # Range
      "x-ms-date:#{date}",
      "x-ms-version:2020-10-02",
      "/#{@storage_account}/#{container}/#{blob_name}"
    ]
    |> Enum.join("\n")

    signature = sign_string(string_to_sign)
    "SharedKey #{@storage_account}:#{signature}"
  end

  defp format_date(datetime) do
    datetime
    |> DateTime.to_naive()
    |> NaiveDateTime.to_string()
    |> String.replace(" ", "T")
    |> Kernel.<>("Z")
  end

  defp format_iso_date(datetime) do
    DateTime.to_iso8601(datetime, :basic)
  end

  defp get_header_value(headers, key) do
    headers
    |> Enum.find(fn {k, _v} -> String.downcase(k) == String.downcase(key) end)
    |> case do
      {_k, v} -> v
      nil -> nil
    end
  end
end
