# VisualQA Inspector — Presentación

---

## Slide 1: Portada

# 🔍 VisualQA Inspector

**Testing visual con IA que entiende intención, no solo píxeles**

Miguel Higorre — SDET / QA Automation Engineer

Código Facilito × AWS × Kiro Hackathon 2026
Reto 4: Productividad para Desarrolladores

---

## Slide 2: El Problema

### El testing visual actual está roto

- Percy, Applitools, Chromatic → comparan **píxeles contra un baseline**
- Cada cambio de 1px en antialiasing, sombras o fuentes = **falso positivo**
- 70-80% de alertas son **ruido** que un humano debe revisar manualmente
- Equipos pierden **3-5 horas por sprint** revisando diffs irrelevantes
- Zero entendimiento de **severidad** o **impacto funcional**

> "Algo cambió en 200 píxeles" ≠ "El botón de compra desapareció"

---

## Slide 3: La Solución

### VisualQA Inspector

Usa **IA multimodal** (Amazon Bedrock - Claude Sonnet 4.5) para:

| Capacidad | Herramientas actuales | VisualQA Inspector |
|---|---|---|
| Método de detección | Pixel diff | Razonamiento semántico |
| Falsos positivos | Alto (flags todo) | Bajo (filtra ruido) |
| Clasificación de severidad | ❌ No existe | ✅ Critical / Minor / Cosmetic |
| Explicaciones en lenguaje natural | ❌ | ✅ |
| Sugerencias de fix | ❌ | ✅ |
| Requiere baseline | Siempre | Opcional (Intent Mode) |

---

## Slide 4: Demo en Vivo

### 🔗 https://develop.d3i53kp2f893z1.amplifyapp.com

1. Sube screenshot **baseline** (versión correcta)
2. Sube screenshot **current** (versión a validar)
3. Click **"Analyze Differences"**
4. En ~10 segundos: reporte con severidad, bounding boxes y sugerencias

### Resultados reales de nuestra demo:

| Bug | Detectado | Severidad |
|---|---|---|
| Label de email eliminado | ✅ | 🔴 Critical |
| Texto botón cambió | ✅ | 🟠 Minor |
| Botón desplazado | ✅ | 🟠 Minor |
| Sombra aumentada | ✅ **Filtrado** (ruido) | — |
| Antialiasing cambiado | ✅ **Filtrado** (ruido) | — |

---

## Slide 5: Arquitectura

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
│               REPORTING LAYER                           │
│   Imágenes anotadas  │  DynamoDB  │  JSON reports       │
└─────────────────────────────────────────────────────────┘
```

---

## Slide 6: Servicios AWS Utilizados

| Servicio | Uso |
|---|---|
| **Amazon Bedrock** | Claude Sonnet 4.5 — análisis visual multimodal |
| **Amazon S3** | Almacenamiento de screenshots, imágenes anotadas, reportes |
| **AWS Lambda** | Orquestación serverless (Node.js 20, arm64) |
| **Amazon API Gateway** | REST API con CORS y throttling |
| **Amazon DynamoDB** | Persistencia de metadatos con TTL |
| **AWS Amplify** | Hosting del dashboard (CDN, HTTPS, auto-deploy) |
| **Amazon CloudWatch** | Logging estructurado |
| **AWS IAM** | Roles de menor privilegio |

**Todo provisionado con Terraform** como infraestructura como código.
**Costo:** ~$0 en idle (serverless), ~$0.10 por análisis.

---

## Slide 7: Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Vite 5 |
| **Backend** | Node.js 20, AWS Lambda |
| **IA** | Amazon Bedrock — Claude Sonnet 4.5 (multimodal) |
| **Storage** | Amazon S3 + DynamoDB |
| **API** | Amazon API Gateway REST |
| **Hosting** | AWS Amplify |
| **IaC** | Terraform |
| **Testing** | Playwright (captura multi-viewport) |
| **Desarrollo** | Kiro CLI (asistente IA) |

---

## Slide 8: Innovación — Lo que nos diferencia

### 1. Filtrado inteligente de ruido
La IA ignora antialiasing, subpixel rendering, compresión — cero configuración manual.

### 2. Clasificación de severidad automática
- **Critical** = rompe funcionalidad → bloquea merge en CI
- **Minor** = visible pero no bloquea
- **Cosmetic** = solo estético

### 3. Sugerencias de fix accionables
No solo dice "algo está mal" — dice exactamente QUÉ cambiar en el código.

### 4. Roadmap: Intent Mode (sin baseline)
Evalúa la UI contra el código fuente directamente — detecta defectos originales que nunca fueron "correctos".

---

## Slide 9: Impacto

### Antes (herramientas actuales):
- 50+ alertas por sprint → 80% falsos positivos
- 3-5 horas de revisión manual por sprint
- Sin priorización — todos los diffs son iguales

### Después (VisualQA Inspector):
- Solo alertas reales, clasificadas por severidad
- 10 segundos por análisis (vs. 15 min de revisión manual)
- Sugerencias de fix incluidas — el dev sabe qué hacer inmediatamente
- CI integration: merge bloqueado automáticamente en issues críticos

> **ROI:** de 5 horas/sprint a 10 minutos — 97% reducción en tiempo de revisión visual.

---

## Slide 10: Roadmap

### ✅ Implementado (MVP)
- Regression Mode (baseline vs. current)
- Dashboard web con upload y resultados
- Multi-viewport (desktop + mobile)
- Filtrado de ruido y clasificación de severidad

### 🔜 Próximos pasos
- **Intent Mode** — testing sin baseline, evaluando contra código fuente
- **Accessibility Mode** — auditoría WCAG 2.1 AA automática
- **GitHub Actions** — PR comments automáticos con reporte visual
- **CI quality gate** — bloquear merge en severidad crítica

---

## Slide 11: Links y Cierre

### 🔗 Links

| | |
|---|---|
| **Live Demo** | https://develop.d3i53kp2f893z1.amplifyapp.com |
| **GitHub** | https://github.com/miguel-higorre-ch/visual-qa-inspector |
| **Video** | [link del video] |

### 👤 Equipo

**Miguel Higorre** — SDET / QA Automation Engineer
8+ años en automatización de pruebas | Selenium, Playwright, AWS

---

### Gracias 🙏

**Construido con 🔍 VisualQA Inspector × Amazon Bedrock × Kiro**

*Código Facilito × AWS × Kiro Hackathon 2026*
