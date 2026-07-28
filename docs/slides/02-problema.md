# El Problema

## El testing visual actual está roto

---

### Herramientas actuales (Percy, Applitools, Chromatic):

- Comparan **píxeles contra un baseline** almacenado
- Cada cambio de 1px en antialiasing, sombras o fuentes = **falso positivo**
- **70-80%** de alertas son ruido que un humano debe revisar manualmente
- Equipos pierden **3-5 horas por sprint** revisando diffs irrelevantes
- Zero entendimiento de severidad o impacto funcional
- No pueden distinguir entre un bug crítico y un cambio cosmético

---

### El resultado:

> "Algo cambió en 200 píxeles"
>
> vs.
>
> "El botón de compra desapareció, es crítico, y aquí está cómo arreglarlo"

Las herramientas actuales solo hacen lo primero. **VisualQA Inspector hace lo segundo.**
