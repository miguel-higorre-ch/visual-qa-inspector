# Servicios AWS Utilizados

## 8 servicios de AWS en producción

---

| Servicio | Uso en el proyecto |
|---|---|
| **Amazon Bedrock** | Claude Sonnet 4.5 — análisis visual multimodal |
| **Amazon S3** | Screenshots, imágenes anotadas, reportes JSON |
| **AWS Lambda** | Orquestación serverless (Node.js 20, arm64, 512MB) |
| **Amazon API Gateway** | REST API con CORS y throttling (10 req/s) |
| **Amazon DynamoDB** | Persistencia de metadatos con TTL (on-demand) |
| **AWS Amplify** | Dashboard hosting (CDN, HTTPS, auto-deploy desde GitHub) |
| **Amazon CloudWatch** | Logging estructurado JSON para debugging |
| **AWS IAM** | Roles de menor privilegio para Lambda |

---

### Costo estimado:

- **En idle:** $0/mes (serverless — paga solo por uso)
- **Por análisis:** ~$0.05-0.15 (tokens de Bedrock)
- **100 análisis/mes:** ~$5-15 total

### Infraestructura como código:

```bash
cd infra/terraform
terraform init && terraform apply
# → 39 recursos creados en 2 minutos
```
