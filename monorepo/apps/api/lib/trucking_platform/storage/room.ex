defmodule TruckingPlatform.Storage.Room do
  @moduledoc """
  Room schema and repository functions for Cosmos DB.
  """

  alias TruckingPlatform.Storage.CosmosDB

  @collection "rooms"

  defstruct [
    :id,
    :org_id,
    :name,
    :description,
    :type,
    :members,
    :settings,
    :created_by,
    :created_at,
    :updated_at
  ]

  @type t :: %__MODULE__{
    id: String.t(),
    org_id: String.t(),
    name: String.t(),
    description: String.t() | nil,
    type: String.t(),
    members: [String.t()],
    settings: map(),
    created_by: String.t(),
    created_at: DateTime.t(),
    updated_at: DateTime.t()
  }

  @room_types ~w(general dispatch trip private)

  def create(params) do
    room = %__MODULE__{
      id: params[:id] || UUID.uuid4(),
      org_id: params[:org_id],
      name: params[:name],
      description: params[:description],
      type: params[:type] || "general",
      members: params[:members] || [],
      settings: params[:settings] || %{},
      created_by: params[:created_by],
      created_at: DateTime.utc_now(),
      updated_at: DateTime.utc_now()
    }

  case validate(room) do
      :ok ->
    doc = Map.from_struct(room) |> Map.put(:docType, "room")
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

  def list_by_org(org_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    sql = """
    SELECT * FROM rooms r 
    WHERE r.orgId = @orgId 
    ORDER BY r.name
    OFFSET @offset LIMIT @limit
    """
    
    params = [orgId: org_id, offset: offset, limit: limit]

    case CosmosDB.query(@collection, sql, params) do
      {:ok, docs} -> {:ok, Enum.map(docs, &from_document/1)}
      error -> error
    end
  end

  def list_by_user(user_id, org_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    sql = """
    SELECT * FROM rooms r 
    WHERE r.orgId = @orgId 
    AND (ARRAY_CONTAINS(r.members, @userId) OR r.type = 'general')
    ORDER BY r.name
    OFFSET @offset LIMIT @limit
    """
    
    params = [orgId: org_id, userId: user_id, offset: offset, limit: limit]

    case CosmosDB.query(@collection, sql, params) do
      {:ok, docs} -> {:ok, Enum.map(docs, &from_document/1)}
      error -> error
    end
  end

  def add_member(room_id, org_id, user_id) do
    case get(room_id, org_id) do
      {:ok, room} ->
        if user_id not in room.members do
          updated_members = [user_id | room.members]
          update(room, %{members: updated_members})
        else
          {:ok, room}
        end
      
      error -> error
    end
  end

  def remove_member(room_id, org_id, user_id) do
    case get(room_id, org_id) do
      {:ok, room} ->
        updated_members = Enum.reject(room.members, &(&1 == user_id))
        update(room, %{members: updated_members})
      
      error -> error
    end
  end

  def user_has_access?(%__MODULE__{} = room, user_id) do
    (room.type || "general") == "general" or user_id in (room.members || [])
  end

  def update(%__MODULE__{} = room, params) do
    updated_room = %{room | 
      updated_at: DateTime.utc_now()
    } |> struct(params)

    case validate(updated_room) do
      :ok ->
  doc = Map.from_struct(updated_room) |> Map.put(:docType, "room")
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
      name: doc["name"],
      description: doc["description"],
      type: doc["type"],
      members: doc["members"] || [],
      settings: doc["settings"] || %{},
      created_by: doc["createdBy"],
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

  defp validate(%__MODULE__{} = room) do
    cond do
      is_nil(room.id) or room.id == "" ->
        {:error, "ID is required"}
      
      is_nil(room.org_id) or room.org_id == "" ->
        {:error, "Organization ID is required"}
      
      is_nil(room.name) or room.name == "" ->
        {:error, "Name is required"}
      
      room.type not in @room_types ->
        {:error, "Invalid room type"}
      
      is_nil(room.created_by) or room.created_by == "" ->
        {:error, "Created by is required"}
      
      true ->
        :ok
    end
  end
end
