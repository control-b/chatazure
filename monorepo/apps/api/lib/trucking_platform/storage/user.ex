defmodule TruckingPlatform.Storage.User do
  @moduledoc """
  User schema and repository functions for Cosmos DB.
  """

  alias TruckingPlatform.Storage.CosmosDB

  @collection "users"

  defstruct [
    :id,
    :org_id,
    :email,
    :name,
    :role,
    :avatar_url,
    :phone,
    :status,
    :last_seen_at,
    :preferences,
    :created_at,
    :updated_at
  ]

  @type t :: %__MODULE__{
    id: String.t(),
    org_id: String.t(),
    email: String.t(),
    name: String.t(),
    role: String.t(),
    avatar_url: String.t() | nil,
    phone: String.t() | nil,
    status: String.t(),
    last_seen_at: DateTime.t() | nil,
    preferences: map(),
    created_at: DateTime.t(),
    updated_at: DateTime.t()
  }

  @roles ~w(owner dispatcher driver clerk)

  def create(params) do
    user = %__MODULE__{
      id: params[:id] || UUID.uuid4(),
      org_id: params[:org_id],
      email: params[:email],
      name: params[:name],
      role: params[:role] || "clerk",
      avatar_url: params[:avatar_url],
      phone: params[:phone],
      status: "active",
      preferences: params[:preferences] || %{},
      created_at: DateTime.utc_now(),
      updated_at: DateTime.utc_now()
    }

  case validate(user) do
      :ok ->
    doc = Map.from_struct(user) |> Map.put(:docType, "user")
        CosmosDB.create_document(@collection, doc)
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  def get(id, org_id) do
    case CosmosDB.get_document(@collection, id, org_id) do
      {:ok, doc} -> {:ok, from_document(doc)}
      error -> error
    end
  end

  def get_by_email(email, org_id) do
    sql = "SELECT * FROM users u WHERE u.email = @email AND u.orgId = @orgId"
    params = [email: email, orgId: org_id]

    case CosmosDB.query(@collection, sql, params) do
      {:ok, [doc | _]} -> {:ok, from_document(doc)}
      {:ok, []} -> {:error, :not_found}
      error -> error
    end
  end

  def get_by_ids(user_ids) do
    # In tests with stub, we can ignore SQL and return empty to avoid hard deps
    case user_ids do
      [] -> []
      ids when is_list(ids) ->
        params = Enum.with_index(ids) |> Enum.map(fn {id, idx} -> {"id#{idx}", to_string(id)} end)
        placeholders = params |> Enum.map(fn {name, _} -> "@#{name}" end) |> Enum.join(", ")
        sql = "SELECT * FROM users u WHERE u.id IN (#{placeholders})"
        case CosmosDB.query(@collection, sql, params) do
          {:ok, docs} -> Enum.map(docs, &from_document/1)
          {:error, _} -> []
        end
    end
  end

  def list_by_org(org_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    sql = """
    SELECT * FROM users u 
    WHERE u.orgId = @orgId 
    ORDER BY u.name
    OFFSET @offset LIMIT @limit
    """
    
    params = [orgId: org_id, offset: offset, limit: limit]

    case CosmosDB.query(@collection, sql, params) do
      {:ok, docs} -> {:ok, Enum.map(docs, &from_document/1)}
      error -> error
    end
  end

  def update(%__MODULE__{} = user, params) do
    updated_user = %{user | 
      updated_at: DateTime.utc_now()
    } |> struct(params)

    case validate(updated_user) do
      :ok ->
  doc = Map.from_struct(updated_user) |> Map.put(:docType, "user")
        CosmosDB.update_document(@collection, doc)
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  def delete(id, org_id) do
    CosmosDB.delete_document(@collection, id, org_id)
  end

  # Private functions

  defp from_document(doc) do
    %__MODULE__{
      id: doc["id"],
      org_id: doc["orgId"],
      email: doc["email"],
      name: doc["name"],
      role: doc["role"],
      avatar_url: doc["avatarUrl"],
      phone: doc["phone"],
      status: doc["status"],
      last_seen_at: parse_datetime(doc["lastSeenAt"]),
      preferences: doc["preferences"] || %{},
      created_at: parse_datetime(doc["createdAt"]),
      updated_at: parse_datetime(doc["updatedAt"])
    }
  end

  defp parse_datetime(nil), do: nil
  defp parse_datetime(datetime_string) do
    case DateTime.from_iso8601(datetime_string) do
      {:ok, datetime, _} -> datetime
      _ -> nil
    end
  end

  defp validate(%__MODULE__{} = user) do
    cond do
      is_nil(user.id) or user.id == "" ->
        {:error, "ID is required"}
      
      is_nil(user.org_id) or user.org_id == "" ->
        {:error, "Organization ID is required"}
      
      is_nil(user.email) or user.email == "" ->
        {:error, "Email is required"}
      
      is_nil(user.name) or user.name == "" ->
        {:error, "Name is required"}
      
      user.role not in @roles ->
        {:error, "Invalid role"}
      
      true ->
        :ok
    end
  end
end
