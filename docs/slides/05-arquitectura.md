# Arquitectura

## 100% Serverless en AWS — Costo cero en idle

---

```
┌─────────────────────────────────────────────────────────┐
│                   TRIGGER LAYER                          │
│   Dashboard Upload  │  Playwright CLI  │  GitHub Actions │
└──────────┬──────────┴────────┬─────────┴────────┬───────┘
           ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                 STORAGE — Amazon S3                      │
│   /baseline/  │  /current/  │  /annotated/  │ /reports/ │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│          API Gateway → AWS Lambda (Node.js 20)          │
│   POST /analyze  │  POST /presign  │  GET /history      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│          Amazon Bedrock — Claude Sonnet 4.5             │
│   Visión multimodal + JSON estructurado                 │
│   Diff semántico · Filtro de ruido · Severidad          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│          REPORTING — DynamoDB + S3 + Dashboard          │
└─────────────────────────────────────────────────────────┘
```

**Infraestructura como código:** Todo provisionado con Terraform.
