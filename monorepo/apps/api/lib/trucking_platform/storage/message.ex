defmodule TruckingPlatform.Storage.Message do
  @moduledoc """
  Message schema and repository functions for Cosmos DB.
  """

  alias TruckingPlatform.Storage.CosmosDB

  @collection "messages"

  defstruct [
    :id,
    :room_id,
    :user_id,
    :org_id,
    :content,
    :type,
    :attachments,
    :reply_to,
    :edited_at,
    :timestamp,
    :metadata
  ]

  @type t :: %__MODULE__{
    id: String.t(),
    room_id: String.t(),
    user_id: String.t(),
    org_id: String.t(),
    content: String.t(),
    type: String.t(),
    attachments: [map()],
    reply_to: String.t() | nil,
    edited_at: DateTime.t() | nil,
    timestamp: DateTime.t(),
    metadata: map()
  }

  @message_types ~w(text file image system geo_event signature_request)

  def create(params) do
    message = %__MODULE__{
      id: params[:id] || UUID.uuid4(),
      room_id: params[:room_id],
      user_id: params[:user_id],
      org_id: params[:org_id],
      content: params[:content],
      type: params[:type] || "text",
      attachments: params[:attachments] || [],
      reply_to: params[:reply_to],
      timestamp: params[:timestamp] || DateTime.utc_now(),
      metadata: params[:metadata] || %{}
    }

    case validate(message) do
      :ok ->
        doc = Map.from_struct(message) |> Map.put(:docType, "message")
        case CosmosDB.create_document(@collection, doc) do
          {:ok, stored} -> {:ok, from_document(stored)}
          other -> other
        end
      
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

  def list_by_room(room_id, org_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    before = Keyword.get(opts, :before)

    {sql, params} = case before do
      nil ->
        sql = """
        SELECT * FROM messages m 
        WHERE m.roomId = @roomId AND m.orgId = @orgId 
        ORDER BY m.timestamp DESC
        OFFSET @offset LIMIT @limit
        """
        {sql, [roomId: room_id, orgId: org_id, offset: offset, limit: limit]}
      
      before_timestamp ->
        sql = """
        SELECT * FROM messages m 
        WHERE m.roomId = @roomId AND m.orgId = @orgId 
        AND m.timestamp < @before
        ORDER BY m.timestamp DESC
        OFFSET @offset LIMIT @limit
        """
        {sql, [roomId: room_id, orgId: org_id, before: before_timestamp, offset: offset, limit: limit]}
    end

    case CosmosDB.query(@collection, sql, params) do
      {:ok, docs} -> {:ok, Enum.map(docs, &from_document/1)}
      error -> error
    end
  end

  def search(org_id, query, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    room_id = Keyword.get(opts, :room_id)

    {sql, params} = case room_id do
      nil ->
        sql = """
        SELECT * FROM messages m 
        WHERE m.orgId = @orgId 
        AND CONTAINS(LOWER(m.content), LOWER(@query))
        ORDER BY m.timestamp DESC
        OFFSET 0 LIMIT @limit
        """
        {sql, [orgId: org_id, query: query, limit: limit]}
      
      room_id ->
        sql = """
        SELECT * FROM messages m 
        WHERE m.orgId = @orgId AND m.roomId = @roomId
        AND CONTAINS(LOWER(m.content), LOWER(@query))
        ORDER BY m.timestamp DESC
        OFFSET 0 LIMIT @limit
        """
        {sql, [orgId: org_id, roomId: room_id, query: query, limit: limit]}
    end

    case CosmosDB.query(@collection, sql, params) do
      {:ok, docs} -> {:ok, Enum.map(docs, &from_document/1)}
      error -> error
    end
  end

  def update(%__MODULE__{} = message, params) do
    updated_message = struct(message, params)

    case validate(updated_message) do
      :ok ->
        doc = Map.from_struct(updated_message) |> Map.put(:docType, "message")
        case CosmosDB.update_document(@collection, doc) do
          {:ok, stored} -> {:ok, from_document(stored)}
          other -> other
        end
      
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
      id: doc["id"] || doc[:id],
      room_id: doc["roomId"] || doc[:room_id],
      user_id: doc["userId"] || doc[:user_id],
      org_id: doc["orgId"] || doc[:org_id],
      content: doc["content"] || doc[:content],
      type: doc["type"] || doc[:type],
      attachments: doc["attachments"] || doc[:attachments] || [],
      reply_to: doc["replyTo"] || doc[:reply_to],
      edited_at: parse_datetime(doc["editedAt"] || doc[:edited_at]),
      timestamp: parse_datetime(doc["timestamp"] || doc[:timestamp]),
      metadata: doc["metadata"] || doc[:metadata] || %{}
    }
  end

  def to_broadcast(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "room_id" => m.room_id,
      "user_id" => m.user_id,
      "org_id" => m.org_id,
      "content" => m.content,
      "type" => m.type,
      "attachments" => m.attachments,
      "reply_to" => m.reply_to,
      "edited_at" => (if m.edited_at, do: DateTime.to_iso8601(m.edited_at), else: nil),
      "timestamp" => DateTime.to_iso8601(m.timestamp),
      "metadata" => m.metadata
    }
  end

  defp parse_datetime(nil), do: nil
  defp parse_datetime(datetime_string) do
    case DateTime.from_iso8601(datetime_string) do
      {:ok, datetime, _} -> datetime
      _ -> nil
    end
  end

  defp validate(%__MODULE__{} = message) do
    cond do
      is_nil(message.id) or message.id == "" ->
        {:error, "ID is required"}
      
      is_nil(message.room_id) or message.room_id == "" ->
        {:error, "Room ID is required"}
      
      is_nil(message.user_id) or message.user_id == "" ->
        {:error, "User ID is required"}
      
      is_nil(message.org_id) or message.org_id == "" ->
        {:error, "Organization ID is required"}
      
      is_nil(message.content) or message.content == "" ->
        {:error, "Content is required"}
      
      message.type not in @message_types ->
        {:error, "Invalid message type"}
      
      true ->
        :ok
    end
  end
end
