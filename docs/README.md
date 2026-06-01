# Semillero — Plan de Integración Frontend con Workflow Automated Recruiter

## Descripción general

El backend ya cuenta con un workflow en n8n (`Automated_Recruiter webhook`) que recibe mensajes de reclutamiento, los analiza con IA y devuelve hasta 10 candidatos filtrados registrados en Google Sheets y en la plataforma Testelum.

Este documento describe el plan de trabajo para que el frontend consuma e interactúe correctamente con ese workflow.

---

## Arquitectura de comunicación

```
Usuario (Frontend)
     │
     │  POST /procesoReclutamiento
     │  { "mensaje": "...", "token": "..." }
     ▼
  n8n Webhook
     │
     └─► Análisis IA → Búsqueda candidatos → Registro en Sheets + Testelum
```

El frontend solo necesita:
1. Enviar el mensaje del usuario al webhook.
2. Recibir y mostrar la respuesta del workflow.
3. Manejar el estado de sesión mediante el campo `token`.

---

## Variables de entorno requeridas

Agrega las siguientes variables en `frontend/.env.local`:

```env
NEXT_PUBLIC_WEBHOOK_URL=https://<tu-instancia-n8n>/webhook/procesoReclutamiento
NEXT_PUBLIC_APP_TOKEN=<token-de-sesión-fijo-o-por-usuario>
```

---

## Plan de trabajo

### Fase 1 — Conexión con el webhook

- [ ] Crear servicio `src/services/recruiterService.ts` que encapsule el `POST` al webhook.
- [ ] Definir tipos TypeScript para el request y la respuesta del webhook.
- [ ] Manejar los tres tipos de respuesta posibles: `solicitud nueva`, `continuar solicitud`, `NA`.

**Estructura del request:**
```ts
interface RecruiterRequest {
  mensaje: string;
  token: string;
}
```

**Estructura esperada de respuesta (candidatos):**
```ts
interface Candidate {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  hireDate: string;
  experience: string;
  salaryExpectation: number;
  linkedinLink: string;
  cvLink: string | null;
  requestStatus: string;
  candidateStatus: string;
}

interface RecruiterResponse {
  numeroSolicitud: number;
  candidatos: Candidate[];
  totalEncontrados: number;
}
```

---

### Fase 2 — Interfaz de chat / solicitud

- [ ] Crear componente `RecruiterChat` que permita al usuario escribir el mensaje de solicitud.
- [ ] Mostrar estado de carga mientras el workflow procesa (puede tardar varios segundos).
- [ ] Si el tipo detectado es `NA`, mostrar el mensaje de saludo/opciones devuelto por el workflow.
- [ ] Si el tipo es `solicitud nueva` o `continuar solicitud`, mostrar la lista de candidatos resultantes.

---

### Fase 3 — Visualización de candidatos

- [ ] Crear componente `CandidateCard` con los campos: nombre, cargo, experiencia, aspiración salarial, LinkedIn, estado.
- [ ] Crear página o sección `SolicitudResultado` que liste los candidatos de una solicitud.
- [ ] Agregar enlace al perfil de LinkedIn cuando esté disponible.
- [ ] Indicar visualmente si el candidato proviene de la base interna (tiene email) o de LinkedIn (solo URL).

---

### Fase 4 — Gestión de solicitudes

- [ ] Crear vista de historial de solicitudes (usando `IdSolicitud` del Google Sheet `ListadoCandidatos`).
- [ ] Permitir al usuario retomar una solicitud existente enviando el número de solicitud en el mensaje.
- [ ] Mostrar el estado actual de cada candidato (`En Proceso`, `Pendiente de Revisión`, etc.).

---

### Fase 5 — Manejo de errores y edge cases

- [ ] Timeout si el webhook no responde en menos de 30 segundos.
- [ ] Mensaje al usuario si no se encontraron candidatos.
- [ ] Validación del campo `mensaje` antes de enviar (no vacío, longitud mínima).
- [ ] Proteger la ruta de reclutamiento con autenticación (token de sesión válido).

---

## Nodos del workflow relevantes para el frontend

| Nodo              | Qué produce                                      | Cuándo importa al frontend          |
|-------------------|--------------------------------------------------|--------------------------------------|
| ANALIZA           | Clasifica el mensaje en tipo + cargo/experiencia | Siempre                              |
| Switch3 → NA      | Devuelve saludo con opciones                     | Mensaje no relacionado               |
| Code10 / Code11 / Code12 | Payload final de candidatos a Testelum  | Solicitud nueva o continuada         |
| ValidacionBusqueda1 | Total de candidatos encontrados internamente   | Para saber si se usó SerpApi         |
| Append row sheet3/4/5 | Registro en Google Sheets                  | Confirmación de guardado             |

---

## Notas importantes

- El campo `token` debe mantenerse constante durante la sesión del usuario; es usado por el workflow para autenticar la llamada a Testelum.
- La experiencia se clasifica automáticamente por el workflow: `0-2 años → junior`, `3-5 años → semi senior`, `6+ años → senior`. No es necesario enviarlo desde el frontend.
- Si el mensaje del usuario incluye un número de solicitud, el workflow lo detecta automáticamente como "continuar solicitud".
- Los candidatos de LinkedIn no tienen email; el workflow usa la URL de LinkedIn como sustituto en el campo `email`. Considerar esto al mostrarlos en la UI.
- El workflow puede tardar entre 5 y 15 segundos dependiendo de si consulta SerpApi. Mostrar un indicador de carga apropiado.

---

## Referencia rápida de la documentación completa

Ver: [`docs/workflow_automated_recruiter.txt`](./workflow_automated_recruiter.txt)
