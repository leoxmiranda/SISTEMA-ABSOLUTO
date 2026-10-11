# SISTEMA DEL ABSOLUTO

Bot de Discord para el canal **El Dominio Absoluto** (@eldominioabsoluto).

## Funcionalidades

- 🔢 **Asignación automática de apodos secuenciales** — Al unirse, cada miembro recibe `[Constelación Sin Nombre N-XXXXXX]`
- 🔒 **Apodos inmutables** — Nadie puede cambiarse el apodo; el Sistema lo protege
- ⭐ **Puntos Estelares** — Sistema de puntos con reclamo diario (+200)
- 🏆 **Ranking** — Top 10 de constelaciones con más puntos
- 🔄 **Memoria permanente** — Si un miembro sale y vuelve, conserva su número original

## Comandos Slash

| Comando | Descripción |
|---------|-------------|
| `/registro` | Consulta tu número de Constelación |
| `/puntos` | Consulta tus Puntos Estelares |
| `/ranking` | Top 10 de Constelaciones |
| `/diario` | Reclama +200 ⭐ diarios |
| `/info` | Información del Sistema |
| `/reset-constelacion` | [Admin] Reinicia puntos de una constelación |

## Despliegue en Railway

1. Configura las variables de entorno en Railway:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `OWNER_ID`
2. Railway detecta el `Dockerfile` y despliega automáticamente.

## Estructura

```
├── src/
│   └── app.js          # Bot principal (archivo único)
├── data/
│   └── constellations.json  # Base de datos local
├── package.json
├── Dockerfile
└── .env.example
```
