# Stack Tecnológico

---

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Vite 5 |
| **Backend** | Node.js 20, AWS Lambda (arm64) |
| **IA / ML** | Amazon Bedrock — Claude Sonnet 4.5 (multimodal) |
| **Storage** | Amazon S3 (imágenes) + DynamoDB (metadatos) |
| **API** | Amazon API Gateway REST |
| **Hosting** | AWS Amplify (CDN global) |
| **IaC** | Terraform (39 recursos) |
| **Capture** | Playwright + Chromium (multi-viewport) |
| **Validación** | ajv (JSON Schema) |
| **Anotación** | jimp (bounding boxes en imágenes) |
| **Desarrollo** | Kiro CLI (asistente IA) |

---

### Estructura del proyecto:

```
visual-qa-inspector/
├── dashboard/     → React web app (Amplify)
├── demo-app/      → App demo con bugs inyectados
├── playwright/    → Captura multi-viewport + S3 upload
├── lambda/        → Backend serverless (Bedrock, S3, DynamoDB)
├── infra/         → Terraform IaC
└── docs/          → Diagramas de arquitectura (Mermaid)
```
