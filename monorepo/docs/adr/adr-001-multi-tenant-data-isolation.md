# Architecture Decision Record: Multi-tenant Data Isolation

**Status**: Accepted  
**Date**: 2024-01-15  
**Deciders**: Development Team

## Context

The trucking collaboration platform needs to support multiple organizations (tenants) while ensuring complete data isolation and privacy. Each organization should only access their own data, users, and resources.

## Decision

We will implement organization-scoped data isolation using the following approach:

### 1. Organization-based Scoping

- Every data model includes an `org_id` field
- All queries automatically filter by the current user's organization
- Phoenix contexts enforce organization scoping at the API level

### 2. Authentication & Authorization

- Azure AD B2C provides organization-aware user authentication
- JWT tokens include organization claims
- Plug pipeline validates organization membership for each request

### 3. Database Design

```sql
-- All tables include org_id for tenant isolation
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  room_id UUID NOT NULL,
  content TEXT,
  sender_id UUID NOT NULL,
  created_at TIMESTAMP
);

-- Row-level security policies (if using PostgreSQL)
CREATE POLICY messages_org_isolation ON messages
  FOR ALL TO application_user
  USING (org_id = current_setting('app.current_org_id')::UUID);
```

### 4. Phoenix Context Implementation

```elixir
defmodule TruckingPlatform.Messaging do
  def list_messages(room_id, org_id) do
    Message
    |> where([m], m.org_id == ^org_id and m.room_id == ^room_id)
    |> Repo.all()
  end
end
```

## Consequences

### Positive

- **Strong Data Isolation**: Complete separation between organizations
- **Privacy Compliance**: Meets data protection requirements
- **Scalable**: Can support unlimited organizations
- **Clear Boundaries**: Explicit organization context in all operations

### Negative

- **Additional Complexity**: Every query needs organization filtering
- **Performance Overhead**: Extra WHERE clauses on all queries
- **Development Overhead**: Developers must remember to include org_id

### Mitigated Risks

- **Data Leakage**: Prevented by consistent org_id filtering
- **Performance**: Mitigated by proper indexing on org_id columns
- **Developer Errors**: Mitigated by automated testing and code review

## Implementation Guidelines

### 1. Data Models

```elixir
defmodule TruckingPlatform.Messaging.Message do
  use Ecto.Schema

  schema "messages" do
    field :org_id, :binary_id  # Required on all models
    field :content, :string
    # ... other fields
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:org_id, :content])
    |> validate_required([:org_id, :content])
  end
end
```

### 2. Controller Authentication

```elixir
defmodule TruckingPlatformWeb.MessageController do
  use TruckingPlatformWeb, :controller

  plug TruckingPlatformWeb.Plugs.RequireAuth
  plug TruckingPlatformWeb.Plugs.RequireOrg

  def index(conn, params) do
    org_id = conn.assigns.current_org.id
    messages = Messaging.list_messages(params["room_id"], org_id)
    render(conn, "index.json", messages: messages)
  end
end
```

### 3. Channel Authorization

```elixir
defmodule TruckingPlatformWeb.RoomChannel do
  def join("room:" <> room_id, _params, socket) do
    user_org_id = socket.assigns.org_id

    case Rooms.get_room(room_id, user_org_id) do
      nil -> {:error, %{reason: "unauthorized"}}
      room -> {:ok, socket}
    end
  end
end
```

## Testing Strategy

### 1. Unit Tests

- Test organization scoping in all contexts
- Verify unauthorized access is blocked
- Test edge cases (nil org_id, invalid org_id)

### 2. Integration Tests

- Multi-tenant scenarios with different organizations
- Cross-organization access attempts
- Channel and HTTP endpoint security

### 3. Security Audits

- Regular reviews of data access patterns
- Automated scanning for missing org_id filters
- Penetration testing for tenant isolation

## Monitoring & Observability

### 1. Logging

- Log all organization context in requests
- Track cross-organization access attempts
- Monitor query patterns for missing filters

### 2. Metrics

- Organization-specific usage metrics
- Data isolation compliance metrics
- Performance impact of organization filtering

## Related Decisions

- [ADR-002: Authentication with Azure AD B2C](./adr-002-authentication.md)
- [ADR-003: Database Design Patterns](./adr-003-database-design.md)
