# La Solución

## VisualQA Inspector

Usa **IA multimodal** (Amazon Bedrock - Claude Sonnet 4.5) para analizar screenshots semánticamente.

---

### Comparación directa:

| Capacidad | Percy / Applitools | VisualQA Inspector |
|---|---|---|
| Método de detección | Pixel diff | Razonamiento IA multimodal |
| Tasa de falsos positivos | Alta (marca todo) | Baja (filtra ruido automáticamente) |
| Clasificación de severidad | ❌ No existe | ✅ Critical / Minor / Cosmetic |
| Explicaciones en lenguaje natural | ❌ | ✅ |
| Sugerencias de fix | ❌ | ✅ |
| Evaluación de accesibilidad | ❌ | ✅ (WCAG 2.1 AA) |
| Requiere baseline siempre | Sí | No (Intent Mode) |

---

### Flujo:

**Sube 2 screenshots → IA analiza diferencias → Reporte estructurado con severidad y fix**
