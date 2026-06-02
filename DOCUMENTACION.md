# Semillero — Plataforma de Reclutamiento
## Documentación Técnica Completa

---

## Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Infraestructura y Configuración](#3-infraestructura-y-configuración)
4. [Backend](#4-backend)
5. [Frontend](#5-frontend)
6. [Base de Datos](#6-base-de-datos)
7. [Automatización n8n](#7-automatización-n8n)
8. [Flujo de Autenticación](#8-flujo-de-autenticación)
9. [API Reference](#9-api-reference)
10. [Hallazgos de Auditoría](#10-hallazgos-de-auditoría)

---

## 1. Visión General

Plataforma web de gestión de reclutamiento que permite a recruiters administrar candidatos, comunicarse en tiempo real y automatizar la búsqueda de candidatos mediante IA (n8n + OpenAI + SerpApi).

**Stack principal:**

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14, TypeScript, React Query |
| Auth | Supabase Auth |
| Backend API | Node.js, Express, TypeScript |
| Base de datos | PostgreSQL 16 (local) + Supabase (producción) |
| Tiempo real | Socket.io |
| Automatización | n8n, OpenRouter (DeepSeek), OpenAI GPT-4o-mini, SerpApi |

---

## 2. Arquitectura del Sistema

```
Browser
  │
  ├──► Next.js (puerto 3002)
  │      ├── Supabase Auth (auth + DB en producción)
  │      └── API calls ──► Express Backend (puerto 3001)
  │                              ├── PostgreSQL (puerto 5434, Docker)
  │                              └── Socket.io (WebSocket)
  │
  └──► n8n (puerto 5678)
         ├── Webhook entrada: POST /procesoReclutamiento
         ├── OpenRouter / DeepSeek — clasificación de intención
         ├── OpenAI GPT-4o-mini — filtrado de candidatos
         ├── SerpApi — scraping LinkedIn
         └── Google Sheets — base de candidatos + registro
```

### Roles de usuario

| Rol | Permisos |
|---|---|
| `superAdmin` | Todo: crear/eliminar usuarios, candidatos, ver dashboard |
| `recruiter` | Crear candidatos, ver lista, usar chat |
| `admin` (backend) | Equivalente a superAdmin en API Express |
| `candidate` | Sin acceso al panel (rol legado backend) |

---

## 3. Infraestructura y Configuración

### Variables de entorno

**`backend/.env`**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://semillero:semillero_dev@localhost:5434/semillero
JWT_SECRET=<mínimo 32 caracteres>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3002

# Opcional — notificaciones por email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Levantar el proyecto localmente

```bash
# 1. Base de datos (Docker)
docker compose up db -d

# 2. Backend
cd backend
npm run dev        # tsx watch --env-file=.env src/server.ts

# 3. Frontend
cd frontend
PORT=3002 npm run dev
```

> El puerto 3000 puede estar ocupado por otros proyectos. El frontend corre en 3002.

### Docker Compose

`docker-compose.yml` define tres servicios:

| Servicio | Puerto | Imagen |
|---|---|---|
| `db` | 5434→5432 | postgres:16-alpine |
| `backend` | 3001 | build ./backend |
| `frontend` | 3000 | build ./frontend |

La migración `001_initial.sql` se aplica automáticamente al iniciar el contenedor `db`.

---

## 4. Backend

**Ruta raíz:** `/home/julian/frontend/semillero/backend/src/`

### 4.1 Punto de entrada — `server.ts`

Crea el servidor HTTP, instancia Socket.io y arranca en `config.PORT` (3001).

```
server.ts
  ├── createApp()          ← Express app
  ├── SocketServer         ← Socket.io sobre http
  ├── setupChat(io)        ← handlers WebSocket
  └── SIGTERM / SIGINT     ← graceful shutdown (cierra pool PG)
```

### 4.2 App Express — `app.ts`

Middleware en orden de ejecución:

| Middleware | Propósito |
|---|---|
| `helmet()` | Headers de seguridad HTTP |
| `cors()` | Permite origen `CORS_ORIGIN` con credenciales |
| `express.json({ limit: '1mb' })` | Parseo de body JSON |
| `correlationMiddleware` | Agrega `x-correlation-id` a cada request |
| `rateLimit` | Máx 100 requests por IP cada 15 min |

Rutas registradas:
- `GET /health` — healthcheck, devuelve `{ status: 'ok', timestamp }`
- `POST|GET /api/auth/*` — autenticación
- `GET|POST|PATCH|DELETE /api/candidates/*` — candidatos

### 4.3 Configuración — `config/index.ts`

Valida variables de entorno con **Zod** al arrancar. Si falta alguna variable requerida, el proceso termina con error explícito.

Variables requeridas: `DATABASE_URL`, `JWT_SECRET`
Variables con default: `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `LOG_LEVEL`, `CORS_ORIGIN`

### 4.4 Base de datos — `db/index.ts`

Pool de PostgreSQL configurado:
- `max: 20` conexiones simultáneas
- `idleTimeoutMillis: 30000`
- Función `query<T>()` genérica con tipado TypeScript
- Función `withTransaction()` con rollback automático en error

### 4.5 Middlewares

#### `middlewares/auth.ts`

**`authenticate`** — verifica JWT Bearer token:
- Extrae token del header `Authorization: Bearer <token>`
- Verifica firma con `JWT_SECRET`
- Puebla `req.user = { id, email, role }`
- Error 401 si no hay token, 403 si expirado o inválido

**`authorize(...roles)`** — factory de middleware RBAC:
- Verifica que `req.user.role` esté en la lista de roles permitidos
- Error 403 si el rol no tiene acceso

#### `middlewares/errorHandler.ts`

Maneja tres tipos de error:
- `ZodError` → HTTP 422 con detalle de campos inválidos
- `AppError` → HTTP con el código definido en el error
- Cualquier otro → HTTP 500 genérico

`AppError` es la clase de error de dominio del backend:
```typescript
throw new AppError(409, 'El email ya está registrado');
throw new AppError(404, 'Candidato no encontrado');
throw new AppError(401, 'Credenciales inválidas');
```

### 4.6 Servicios

#### `services/authService.ts`

| Método | Descripción |
|---|---|
| `register(email, password, fullName, role)` | Crea usuario. Hash bcrypt con 12 salt rounds. Error 409 si email ya existe. |
| `login(email, password)` | Valida credenciales. Genera JWT (15min) + refresh token UUID (7 días). Guarda sesión en DB. |
| `refresh(refreshToken)` | Valida refresh token en `user_sessions`. Genera nuevo JWT. |
| `logout(refreshToken)` | Elimina la sesión de `user_sessions`. |

Tokens:
- **Access token:** JWT firmado con `JWT_SECRET`, expira en 15 minutos
- **Refresh token:** UUID v4 aleatorio, almacenado en DB, expira en 7 días

#### `services/candidateService.ts`

| Método | Descripción |
|---|---|
| `create(data, createdBy)` | Inserta candidato. Error 409 si email duplicado. |
| `list(page, limit, status?)` | Lista paginada. Máx 100 por página. Filtro opcional por status. |
| `getById(id)` | Busca por UUID. Error 404 si no existe. |
| `updateStatus(id, status)` | Actualiza campo `status`. Error 404 si no existe. |
| `delete(id)` | Elimina por UUID. Error 404 si no existe. |

Schema de validación de entrada (Zod):
```typescript
{
  first_name: string (1-100 chars),
  last_name:  string (1-100 chars),
  email:      string email válido,
  phone?:     string (max 50),
  position?:  string (max 150),
  resume_url?: string URL válida
}
```

#### `services/chatService.ts`

| Método | Descripción |
|---|---|
| `saveMessage(roomId, senderId, content)` | Persiste mensaje en `chat_messages`. |
| `getHistory(roomId, before?, limit=50)` | Historial con paginación por cursor (timestamp). |
| `markRoomAsRead(roomId, userId)` | Marca como leídos los mensajes de otros usuarios en la sala. |

#### `services/notificationService.ts`

Envía emails HTML vía Nodemailer (SMTP configurable).

- `notifyCandidateCreated(email, name)` — notifica al candidato su registro
- `notifyStatusChange(email, name, status)` — notifica cambio de estado (excepto `pending`)

Si SMTP no está configurado, los errores se silencian (`.catch(() => null)`).

### 4.7 Socket.io — `socket/index.ts`

Autenticación: el cliente debe enviar `{ auth: { token: '<JWT>' } }` al conectar.

Eventos que escucha el servidor:

| Evento | Payload | Acción |
|---|---|---|
| `join-room` | `roomId: string` | Une el socket a la sala, marca mensajes como leídos |
| `send-message` | `{ roomId, content }` | Guarda en DB, emite `new-message` a toda la sala |
| `get-history` | `{ roomId, before?, limit? }` | Emite `history` con mensajes históricos |

Eventos que emite el servidor:

| Evento | Destinatario | Payload |
|---|---|---|
| `new-message` | Toda la sala | `ChatMessage` |
| `history` | Socket solicitante | `ChatMessage[]` |
| `error` | Socket solicitante | `{ message: string }` |

### 4.8 Utilidades

#### `utils/logger.ts`
Winston con dos transportes:
- Consola (colorizado en desarrollo)
- Archivo rotativo diario (`logs/app-YYYY-MM-DD.log`), retención 14 días

#### `utils/tracing.ts`
Middleware que genera un `x-correlation-id` UUID por request. Permite rastrear logs de un mismo request end-to-end.

### 4.9 Tipos — `types/index.ts`

```typescript
type UserRole        = 'admin' | 'recruiter' | 'candidate'
type CandidateStatus = 'pending' | 'interviewed' | 'hired' | 'rejected'

interface User         { id, email, full_name, role, is_active, created_at, updated_at }
interface Candidate    { id, first_name, last_name, email, phone?, position?, status, resume_url?, created_by, ... }
interface ChatMessage  { id, room_id, sender_id, content, is_read, created_at }
interface JwtPayload   { sub, email, role, iat, exp }
interface AuthRequest  extends Request { user?: { id, email, role } }
interface PaginatedResponse<T> { items, total, page, limit, totalPages }
```

---

## 5. Frontend

**Ruta raíz:** `/home/julian/frontend/semillero/frontend/src/`

### 5.1 Estructura de páginas (App Router Next.js 14)

```
src/app/
  page.tsx              → redirect a /login
  layout.tsx            → RootLayout, metadata global
  login/page.tsx        → LoginForm
  forgot-password/      → ForgotPasswordForm
  reset-password/       → ResetPasswordForm
  dashboard/page.tsx    → DashboardView (protegida)
  candidates/page.tsx   → CandidatesView (protegida)
  chat/page.tsx         → ChatView (protegida)
  users/page.tsx        → UserManagement (solo superAdmin)
```

Páginas protegidas están envueltas en `<AppShell>`, que verifica sesión activa de Supabase.

### 5.2 Componentes

#### `components/layout/AppShell.tsx`
- Verifica sesión Supabase al montar
- Redirige a `/login` si no hay sesión activa
- Provee `QueryClientProvider` (React Query)
- Renderiza `<Sidebar>` + contenido hijo

#### `components/layout/Sidebar.tsx`
- Navegación principal: Dashboard, Candidatos, Chat
- Sección "Administración" visible solo para rol `superAdmin`
- Muestra nombre y rol del usuario logueado
- Botón de logout (llama `authService.logout()`)

#### `components/auth/LoginForm.tsx`
- Formulario email + contraseña
- Llama `authService.login()` → Supabase Auth
- Persiste usuario en `localStorage` vía `lib/auth.ts`
- Incluye credenciales demo: `demo@semillero.com / Demo1234`
- Toast de error si las credenciales fallan

#### `components/auth/ForgotPasswordForm.tsx`
- Campo de email
- Llama `authService.sendPasswordReset()` → Supabase envía email
- Redirige a `/reset-password` en el email

#### `components/auth/ResetPasswordForm.tsx`
- Nuevo password + confirmación
- Validación: mínimo 8 caracteres, al menos una letra y un número
- Llama `authService.updatePassword()` → Supabase actualiza

#### `components/auth/UserManagement.tsx`
- Solo accesible para `superAdmin`
- Lista usuarios via `authService.listUsers()` (Supabase `profiles`)
- Crear usuario: modal con email, password, nombre, rol (`superAdmin` | `recruiter`)
- Eliminar usuario: botón con confirmación
- Usa React Query (`useQuery`, `useMutation`) para estado y cache

#### `components/candidates/CandidatesView.tsx`
- Vista principal con modal de creación de candidatos
- Formulario: nombre, apellido, email, teléfono, cargo, URL HV
- Llama `candidateService.create()` → Supabase
- Pasa `onRefresh` a `CandidateTable` para recargar tras crear

#### `components/candidates/CandidateTable.tsx`
- Tabla con búsqueda inline (nombre, email, cargo)
- Filtros: estado, ubicación, salario mín/máx, experiencia
- Paginación (15 por página)
- Cambio de estado inline por dropdown
- Fuente de dato marcada (`internal` vs `scraping`)
- Datos via `candidateService.list()` → Supabase

#### `components/dashboard/DashboardView.tsx`
- Tarjetas de stats: total, pendientes, entrevistados, contratados
- Tabla de actividad reciente (últimos 10 candidatos)
- Datos via `candidateService.getStats()` y `candidateService.list()`

#### `components/chat/ChatView.tsx`
- Chat estilo mensajería con historial de Supabase (`chat_history`)
- Respuestas del asistente guardadas con `role: 'assistant'`
- Detecta y renderiza candidatos en formato card dentro del chat
- Scroll automático al último mensaje
- Usa `useRealtimeChat` para Socket.io (tiempo real)

#### `components/ui/Toast.tsx`
- Contenedor de notificaciones flotantes
- Tipos: `success`, `error`, `info`
- Auto-dismiss en 4 segundos
- Posición: esquina inferior derecha

### 5.3 Hooks

#### `hooks/useToast.ts`
```typescript
const { toasts, addToast, removeToast } = useToast();
addToast({ type: 'success', message: 'Candidato creado' });
```
Auto-dismiss a los 4000ms vía `setTimeout`.

#### `hooks/useRealtimeChat.ts`
- Conecta a Socket.io con JWT de Supabase como token
- Maneja: `join-room`, `send-message`, `get-history`
- Escucha `new-message` y actualiza estado local
- Limpia conexión al desmontar el componente

### 5.4 Servicios

#### `services/authService.ts` (frontend)

| Método | Descripción |
|---|---|
| `login(email, password)` | Supabase `signInWithPassword` + fetch perfil de `profiles` |
| `logout()` | Supabase `signOut` |
| `sendPasswordReset(email)` | Supabase `resetPasswordForEmail` con redirect a `/reset-password` |
| `updatePassword(newPassword)` | Supabase `updateUser` |
| `createUser(email, password, fullName, role)` | POST `/api/admin/users` con Bearer token |
| `deleteUser(userId)` | DELETE `/api/admin/users/:id` con Bearer token |
| `listUsers()` | SELECT desde tabla `profiles` de Supabase |

#### `services/candidateService.ts` (frontend)

| Método | Descripción |
|---|---|
| `create(data)` | INSERT en tabla `candidates` de Supabase |
| `list(filters)` | SELECT con filtros: search, status, location, salary, experience |
| `updateStatus(id, status)` | UPDATE `status` en Supabase |
| `delete(id)` | DELETE en Supabase |
| `getStats()` | COUNT agrupado por status |

Filtros disponibles en `list()`:
```typescript
{
  search?: string,       // busca en nombre + email + cargo
  status?: string,
  location?: string,
  minSalary?: number,
  maxSalary?: number,
  minExperience?: number,
  maxExperience?: number,
  page?: number,
  limit?: number
}
```

### 5.5 Librería y configuración

#### `lib/supabase.ts`
Crea el cliente Supabase con `autoRefreshToken`, `persistSession` y `detectSessionInUrl` activados.

#### `lib/auth.ts`
Persistencia de usuario en `localStorage`:
- `saveUser(user)` → guarda en `semillero_user`
- `getUser()` → lee y parsea
- `clearUser()` → elimina

### 5.6 Tipos — `types/index.ts` (frontend)

```typescript
type UserRole        = 'superAdmin' | 'recruiter'
type CandidateStatus = 'pending' | 'interviewed' | 'hired' | 'rejected'
type CandidateSource = 'internal' | 'scraping'

interface User      { id, email, full_name, role }
interface Candidate {
  id, full_name, email, phone?, job_title?, status,
  salary_expectation?, location?, experience_years?,
  linkedin_url?, cv_url?, source, created_at
}
interface ChatMessage   { id, user_id, role: 'user'|'assistant', content, created_at }
interface SearchHistory { id, user_id, query, results_count, created_at }
interface Toast         { id, type: 'success'|'error'|'info', message }
```

> **Nota:** los tipos de `Candidate` difieren entre backend (`first_name`, `last_name`) y frontend (`full_name`, `salary_expectation`, `source`). El frontend usa el schema de Supabase (`002_supabase_schema.sql`), el backend usa el schema PostgreSQL local (`001_initial.sql`).

---

## 6. Base de Datos

### Schema PostgreSQL local — `001_initial.sql`

```sql
users (
  id UUID PK, email UNIQUE, password_hash,
  full_name, role CHECK('admin'|'recruiter'|'candidate'),
  is_active BOOL DEFAULT true, created_at, updated_at
)

user_sessions (
  id UUID PK, user_id FK→users,
  refresh_token TEXT UNIQUE, expires_at, created_at
)

candidates (
  id UUID PK, first_name, last_name, email UNIQUE,
  phone, position, status CHECK('pending'|'interviewed'|'hired'|'rejected'),
  resume_url, created_by FK→users, created_at, updated_at
)

chat_messages (
  id UUID PK, room_id, sender_id FK→users,
  content, is_read BOOL DEFAULT false, created_at
)
```

Índices: `idx_candidates_status`, `idx_candidates_email`, `idx_user_sessions_user`, `idx_user_sessions_token`

Trigger: `update_updated_at` actualiza `updated_at` automáticamente en `users` y `candidates`.

### Schema Supabase — `002_supabase_schema.sql`

Extiende el schema con campos adicionales y Row Level Security (RLS):

```sql
profiles (
  id UUID PK → auth.users,
  email, full_name,
  role CHECK('superAdmin'|'recruiter')
)

candidates (
  id UUID PK, full_name, email, phone?, job_title?,
  status, salary_expectation?, location?,
  experience_years?, linkedin_url?, cv_url?,
  source CHECK('internal'|'scraping'),
  created_by FK→profiles, created_at, updated_at
)

chat_history (
  id UUID PK, user_id FK→profiles,
  role CHECK('user'|'assistant'), content, created_at
)

search_history (
  id UUID PK, user_id FK→profiles,
  query, results_count, created_at
)
```

**Políticas RLS activas:**
- `profiles`: todos los autenticados pueden leer, solo el dueño puede actualizar
- `candidates`: autenticados pueden leer/insertar, solo `superAdmin` puede eliminar
- `chat_history` y `search_history`: cada usuario solo ve sus propios registros

**Trigger:** `on_auth_user_created` crea automáticamente un perfil en `profiles` cuando se registra un usuario en `auth.users`.

---

## 7. Automatización n8n

**Archivo:** `backend/n8n/workflows.json`
**Credenciales:** `backend/n8n/credentials.json`

### Levantar n8n

```bash
cd backend/n8n
docker compose up -d
# Disponible en: http://localhost:5678
```

Al iniciar con DB limpia, importa automáticamente credenciales y workflows.

### Workflow: Automated_Recruiter webhook

**Entrada:** `POST /webhook/procesoReclutamiento`
```json
{ "mensaje": "<texto del usuario>", "token": "<token Testelum>" }
```

**Flujo:**

```
Webhook
  └── ANALIZA (DeepSeek vía OpenRouter)
        Clasifica el mensaje en: "solicitud nueva" | "continuar solicitud" | "NA"
        └── Switch
              ├── solicitud nueva
              │     └── Lee última solicitud en Google Sheets
              │           └── Crea número de solicitud
              │                 └── Lee BaseReclutamiento (candidatos internos, estado="stand by")
              │                       └── Filtrado IA (GPT-4o-mini)
              │                             └── Switch por cantidad encontrada
              │                                   ├── >10  → toma primeros 10 → Google Sheets → Testelum
              │                                   ├── =10  → normaliza → Google Sheets → Testelum
              │                                   └── <10  → SerpApi LinkedIn → combina internos+externos
              │                                              → selecciona hasta 10 → Google Sheets → Testelum
              ├── continuar solicitud
              │     └── mismo flujo desde "Crea número de solicitud" con ID existente
              └── NA → sin acción
```

**Google Sheets usados:**

| Sheet | ID | Uso |
|---|---|---|
| BaseReclutamiento | `1iXqva70GWk-3IRZe_DCiU6IqK8xDvBGTRlonfnFZuZc` | Candidatos internos |
| Candidatos—Solicitudes | `1n7foRyk2_tVOA_0deM18IlRO8STnXvlkQlUqHXdm8cQ` | Registro de solicitudes |
| Candidatos—Copia | `1XqjuN0B4MKGqSkxYX3qqkisQa-3Ke0QzmUoF4jEOBGs` | Copia de seguridad |

**API Testelum:**
```
POST https://apptestplatformapi.azurewebsites.net/v1/rs/matrix/test-platform-dev/
Body: { requestDescription, candidates: [ { lastName, firstName, email, jobTitle,
        hireDate, experience, salaryExpectation, linkedinLink, ... } ] }
```

---

## 8. Flujo de Autenticación

### Login (frontend → Supabase)

```
LoginForm
  └── supabase.auth.signInWithPassword(email, password)
        └── OK → fetch profiles WHERE id = user.id
                    └── localStorage.setUser(user)
                          └── redirect /dashboard
```

### Protección de rutas

```
AppShell.tsx
  └── supabase.auth.getSession()
        ├── session existe → render children
        └── no session     → redirect /login
```

### Socket.io (frontend → backend Express)

```
useRealtimeChat
  └── supabase.auth.getSession() → session.access_token
        └── io.connect(WS_URL, { auth: { token } })
              └── backend verifica JWT con JWT_SECRET
```

> El backend Express y Supabase usan secretos distintos. El JWT de Supabase **no** es válido para el backend Express. El hook `useRealtimeChat` usa el token de Supabase, pero el backend verifica con su propio `JWT_SECRET`. Esto es un problema de integración (ver Auditoría).

---

## 9. API Reference

Base URL: `http://localhost:3001`

### Auth

| Método | Ruta | Auth | Body | Respuesta |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ email, password, full_name, role? }` | `User` |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | No | `{ refreshToken }` | `{ accessToken }` |
| POST | `/api/auth/logout` | JWT | `{ refreshToken }` | 204 |

### Candidatos

Todos requieren `Authorization: Bearer <accessToken>`.

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| GET | `/api/candidates` | candidate | Lista paginada. Query: `page`, `limit`, `status` |
| GET | `/api/candidates/:id` | candidate | Candidato por ID |
| POST | `/api/candidates` | recruiter | Crear candidato |
| PATCH | `/api/candidates/:id/status` | recruiter | Actualizar status |
| DELETE | `/api/candidates/:id` | admin | Eliminar candidato |

### Health

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | `{ status: 'ok', timestamp }` |

---

## 10. Hallazgos de Auditoría

### Críticos

**C1 — Credenciales expuestas en el repositorio**
`backend/n8n/credentials.json` contiene API keys reales (OpenRouter, OpenAI, SerpApi) y OAuth tokens de Google Sheets en texto plano. Este archivo fue subido a GitHub. Todas las keys deben ser revocadas y regeneradas inmediatamente. El archivo debe agregarse al `.gitignore`.

**C2 — Incompatibilidad de JWT entre frontend y backend**
El hook `useRealtimeChat` envía el JWT de Supabase como token para Socket.io, pero el backend verifica con su propio `JWT_SECRET`. La conexión WebSocket fallará en producción. Solución: el frontend debe obtener un token del backend Express o el backend debe validar tokens de Supabase.

**C3 — Credenciales demo hardcodeadas en `LoginForm.tsx`**
`demo@semillero.com / Demo1234` están en el código fuente. Riesgo si el usuario existe en Supabase producción.

### Moderados

**M1 — Dos schemas de DB con modelos diferentes**
`001_initial.sql` (backend) y `002_supabase_schema.sql` (Supabase) tienen schemas incompatibles para `candidates` (campos distintos, relaciones distintas). El backend Express no puede leer candidatos creados desde el frontend y viceversa.

**M2 — Endpoint `/api/admin/users` no existe en el backend**
`authService.createUser()` del frontend llama `POST /api/admin/users`, pero esta ruta no está registrada en `app.ts`. La creación de usuarios desde `UserManagement` fallará.

**M3 — Refresh token sin rotación**
Al hacer refresh, el token antiguo no se invalida. Un token robado puede usarse múltiples veces hasta que expire.

**M4 — Sin límite de intentos de login**
El rate limit global (100 req/15min por IP) no es suficiente para prevenir fuerza bruta en `/api/auth/login`. Se recomienda un rate limit específico por ruta y por email.

### Menores

**m1 — `localStorage` para sesión de usuario**
`lib/auth.ts` guarda el usuario en `localStorage`. Supabase ya persiste la sesión en su propio storage. El `localStorage` puede quedar desincronizado.

**m2 — Emails de notificación silenciados**
`notificationService` usa `.catch(() => null)` — los errores de email se pierden sin log. Dificulta el debugging.

**m3 — Atributo `version` obsoleto en docker-compose.yml**
Docker Compose v2 ignora `version: '3.9'` y muestra warning. Puede eliminarse.

**m4 — Cast excesivo con `as unknown as`**
Múltiples archivos del backend usan `result.rows as unknown as T[]`. Indica que los generics del cliente `pg` no están bien tipados. Considerar `pg-typed` o tipado manual más robusto.

---

*Generado el 2026-06-01 — Semillero Recruitment Platform v1.0*
