defmodule TruckingPlatform.Auth do
  @moduledoc """
  Authentication module for Azure AD B2C integration.
  Handles JWT token verification and user context.
  """

  require Logger
  alias TruckingPlatform.Storage.User

  @azure_tenant_id Application.compile_env(:trucking_platform, :azure_tenant_id)
  @azure_client_id Application.compile_env(:trucking_platform, :azure_client_id)
  @azure_policy_name Application.compile_env(:trucking_platform, :azure_policy_name, "B2C_1_signupsignin")

  def verify_token(token) do
    case decode_and_verify_jwt(token) do
      {:ok, claims} ->
        case extract_user_info(claims) do
          {:ok, user_id, org_id} ->
            {:ok, user_id, org_id}
          
          {:error, reason} ->
            Logger.warn("Failed to extract user info: #{inspect(reason)}")
            {:error, :invalid_claims}
        end
      
      {:error, reason} ->
        Logger.warn("JWT verification failed: #{inspect(reason)}")
        {:error, :invalid_token}
    end
  end

  def generate_channel_token(user_id, org_id) do
    claims = %{
      "sub" => user_id,
      "org_id" => org_id,
      "iat" => System.system_time(:second),
      "exp" => System.system_time(:second) + 3600, # 1 hour
      "iss" => "trucking-platform"
    }

    case JOSE.JWT.sign(jwk(), %{"alg" => "HS256"}, claims) do
      {_, token} -> {:ok, token}
      error -> {:error, error}
    end
  end

  def refresh_token(refresh_token) do
    # In a real implementation, validate refresh token with Azure AD B2C
    # For now, return a simple success
    case verify_token(refresh_token) do
      {:ok, user_id, org_id} ->
        generate_channel_token(user_id, org_id)
      
      error -> error
    end
  end

  # Private functions

  defp decode_and_verify_jwt(token) do
    try do
      # Get public keys from Azure AD B2C
      case get_azure_public_keys() do
        {:ok, keys} ->
          verify_with_keys(token, keys)
        
        {:error, _} ->
          # Fallback to local verification for development
          case JOSE.JWT.verify(jwk(), token) do
            {true, %JOSE.JWT{fields: claims}, _} -> {:ok, claims}
            {false, _, _} -> {:error, :verification_failed}
          end
      end
    rescue
      _ -> {:error, :decode_error}
    end
  end

  defp get_azure_public_keys do
    url = "https://#{@azure_tenant_id}.b2clogin.com/#{@azure_tenant_id}.onmicrosoft.com/#{@azure_policy_name}/discovery/v2.0/keys"
    
    case HTTPoison.get(url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"keys" => keys}} -> {:ok, keys}
          _ -> {:error, :invalid_response}
        end
      
      _ -> {:error, :request_failed}
    end
  end

  defp verify_with_keys(token, keys) do
    # Try each key until one works
    Enum.reduce_while(keys, {:error, :no_valid_key}, fn key, acc ->
      try do
        jwk = JOSE.JWK.from_map(key)
        case JOSE.JWT.verify(jwk, token) do
          {true, %JOSE.JWT{fields: claims}, _} -> {:halt, {:ok, claims}}
          {false, _, _} -> {:cont, acc}
        end
      rescue
        _ -> {:cont, acc}
      end
    end)
  end

  defp extract_user_info(claims) do
    with {:ok, sub} <- Map.fetch(claims, "sub"),
         {:ok, org_id} <- extract_org_id(claims) do
      {:ok, sub, org_id}
    else
      :error -> {:error, :missing_claims}
      error -> error
    end
  end

  defp extract_org_id(claims) do
    # Try different claim names for organization ID
    org_id = claims["extension_OrgId"] || 
             claims["org_id"] || 
             claims["organization_id"] ||
             claims["custom:org_id"]

    if org_id do
      {:ok, org_id}
    else
      {:error, :missing_org_id}
    end
  end

  defp jwk do
    # Use a secret for HMAC signing (development only)
    # In production, this should be loaded from Azure Key Vault
    secret = Application.get_env(:trucking_platform, :jwt_secret, "your-secret-key")
    JOSE.JWK.from_oct(secret)
  end
end
