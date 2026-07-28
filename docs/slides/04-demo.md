# Demo en Vivo

## 🔗 https://develop.d3i53kp2f893z1.amplifyapp.com

---

### Cómo funciona:

1. 📸 Sube screenshot **baseline** (versión correcta aprobada)
2. 📸 Sube screenshot **current** (versión a validar)
3. 🔍 Click **"Analyze Differences"**
4. ⏳ Espera ~10 segundos (Bedrock analizando)
5. 📊 Recibe reporte con severidad, bounding boxes y sugerencias

---

### Resultados reales con nuestra demo app:

| Bug Inyectado | ¿Detectado? | Severidad IA | ¿Percy lo detecta? |
|---|---|---|---|
| Label de email eliminado | ✅ | 🔴 Critical | ✅ (pixel diff) |
| Texto botón "Place Order" → "Submit" | ✅ | 🟠 Minor | ❌ (no detecta texto) |
| Botón desplazado 80px a la izquierda | ✅ | 🟠 Minor | ✅ (pixel diff) |
| Sombra shadow-md → shadow-xl | ✅ **FILTRADO** | — No flaggeado | ❌ (falso positivo) |
| Antialiasing cambiado | ✅ **FILTRADO** | — No flaggeado | ❌ (falso positivo) |

**Clave:** Los cambios cosméticos (sombra, antialiasing) son filtrados automáticamente como ruido.
