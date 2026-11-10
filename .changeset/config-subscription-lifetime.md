---
"@bedrock-core/config": patch
---

Dispose config subscriptions on registry shutdown and when an entity scope is
forgotten. Cancel pending startup reads when the registry stops.
