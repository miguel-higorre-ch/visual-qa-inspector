# Roadmap

---

### ✅ Implementado (MVP — funcional hoy)

- Regression Mode (baseline vs. current con IA multimodal)
- Dashboard web con upload y resultados en tiempo real
- Multi-viewport (desktop 1280px + mobile 375px)
- Filtrado automático de ruido (antialiasing, sombras, compresión)
- Clasificación de severidad (critical / minor / cosmetic)
- Sugerencias de fix en lenguaje natural
- Imágenes anotadas con bounding boxes
- Persistencia en DynamoDB con TTL
- Playwright CLI para captura automatizada
- Terraform IaC (39 recursos AWS)

---

### 🔜 Próximos pasos (diseñados, parcialmente implementados)

- **Intent Mode** — Testing sin baseline
  - Evalúa screenshot contra código fuente (JSX/CSS)
  - Detecta defectos originales que nunca fueron "correctos"

- **Accessibility Mode** — Auditoría WCAG automática
  - 6 reglas WCAG 2.1 AA evaluadas por imagen
  - Contrast, focus, target size, error identification

- **GitHub Actions CI** — PR comments automáticos
  - Capture en cada PR, reporte como comentario inline
  - Quality gate: bloquear merge en severidad crítica

- **Historial de ejecuciones** — Dashboard con runs anteriores
