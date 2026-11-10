# Especificación: evolución de Workout Coach

> **Estado:** implementada. El documento refleja la solución entregada. Las decisiones que cambiaron o surgieron durante el desarrollo están en la sección 12, y la evidencia de build y tests, en la sección 10.

## 1. Contexto y problema

### 1.1 Contexto

Workout Coach es una aplicación en Angular 20 que acompaña una sesión de entrenamiento: cuenta el tiempo de cada repetición, marca los descansos y avisa cuando toca cambiar. Hoy solo maneja un ejercicio, y casi toda su lógica vive dentro de un único componente.

La app funciona, así que reescribirla desde cero sería tirar algo que sirve. Lo que busco es que siga funcionando mientras la ordeno por dentro: separar responsabilidades, poder probarla y, sobre esa base, añadir el entrenamiento completo con una lista de ejercicios.

### 1.2 Estado inicial de la base

Lo primero que encontré es que el código recibido no compilaba ni arrancaba. Antes de tocar la arquitectura hice solo las reparaciones imprescindibles, sin cambiar una sola línea de la lógica:

| Problema | Síntoma | Reparación | Commit |
|---|---|---|---|
| Falta `src/index.html` | `ng build` falla | Crear la página base con `<app-root>` | `0307943` |
| `serve` sin configuración por defecto | `ng serve` exige `buildTarget` | Añadir `defaultConfiguration` | `0307943` |
| Falta `zone.js` | Error `NG0908` en ejecución | Instalarlo y declararlo en `polyfills` de `build` | `0307943` |
| Falta `@types/jasmine` | Los tests no compilan | Instalarlo como dependencia de desarrollo | `eb1ed61` |
| `test` sin `polyfills` | Error `NG0908` en los tests | Declarar `zone.js` y `zone.js/testing` | `eb1ed61` |

Con eso, `npm run build`, `npm start` y `npm test` funcionan, y hay una base estable desde la que empezar.

### 1.3 Problemas de diseño

Con la app en marcha aparecen varios problemas de diseño. Ninguno impide que funcione hoy, pero todos hacen más difícil cambiarla sin romper algo:

| Problema | Evidencia | Consecuencia |
|---|---|---|
| Lógica de negocio en el componente | `WorkoutTimerComponent.start()` contiene el temporizador y todas las transiciones | No se puede probar la lógica sin Angular ni reutilizarla |
| Tipado débil | `exercise: any`, `timer: any`, `getWorkout(): any` | El compilador no detecta errores de contrato |
| Estado mutable y disperso | Seis campos mutables independientes (`seconds`, `completed`, `running`, `resting`, `toast`, `timer`) | Se pueden alcanzar combinaciones inválidas |
| DTO expuesto a la vista | El template lee `exercise_name` y `repetitions_number` | Un cambio en la API externa impacta en la presentación |
| Acoplamiento a la implementación | El componente depende directamente de `WorkoutService` | No se puede sustituir la fuente de datos |
| Temporizador imperativo sin limpieza | `setInterval` sin `ngOnDestroy` | El intervalo sigue activo si el componente se destruye |
| Presentación y negocio mezclados | Un único componente con plantilla, estado y reglas | Baja cohesión y componentes no reutilizables |
| Sintaxis y patrones antiguos | `*ngIf`, `[ngClass]`, `CommonModule`, inyección por constructor, sin `OnPush` | No aprovecha las capacidades actuales de Angular |
| Cobertura insuficiente | Un único test que solo verifica que se crea `AppComponent` | Ningún test protege el comportamiento durante el refactor |

### 1.4 Defectos funcionales detectados

Al revisar el componente también aparecen tres fallos de comportamiento. El primero es el más serio, porque permite pasarse del número de repeticiones:

| Defecto | Causa | Efecto |
|---|---|---|
| El entrenamiento puede continuar tras finalizar | Al terminar, `running` vuelve a `false` y `start()` no comprueba si la sesión acabó | Pulsar Start de nuevo lleva el contador a `4 / 3` |
| Formato de tiempo limitado | El prefijo `00:` es fijo en el template | 90 segundos se mostraría como `00:90` |
| Clase de descanso sin efecto | `[ngClass]` aplica `rest`, pero no existe ese estilo | El descanso no se distingue visualmente |

### 1.5 Limitación funcional

Por último, la app solo sabe manejar un ejercicio. No hay lista, ni estado por ejercicio, ni paso automático al siguiente, y eso es justo lo que pide la nueva funcionalidad.

## 2. Alcance y fuera de alcance

El reto deja claro que prefiere poco y bien hecho antes que mucho y a medias. Por eso esta sección dice qué entra y, con el mismo cuidado, qué dejo fuera y por qué.

### 2.1 Dentro del alcance

**Arquitectura**

- Reorganizar la feature en las capas `domain`, `application`, `infrastructure` y `presentation`.
- Invertir la dependencia de datos mediante el puerto `WorkoutRepository`.
- Mapear el DTO externo en `snake_case` al modelo de dominio dentro de `infrastructure`.
- Separar un componente container de componentes presentacionales sin dependencias inyectadas.

**Funcionalidad**

- Entrenamiento completo: el mock devuelve una lista de ejercicios y la sesión avanza automáticamente entre ellos.
- Estado visible por ejercicio: Pendiente, En curso o Completado.
- Conservar el temporizador de repetición y descanso, la notificación, el contador y los controles Iniciar, Pausar y Reiniciar.
- Interfaz en español, con los términos que usan los criterios de aceptación (decisión D2).
- Barra de progreso segmentada, con un tramo por repetición del ejercicio actual y el contador destacado (CA21). Se añadió después de la primera entrega (decisión D8).

**Corrección de defectos (sección 1.4)**

- Impedir que la sesión continúe una vez finalizada.
- Formatear el tiempo como `mm:ss` fuera del template.
- Distinguir visualmente la fase de descanso.

**Angular moderno**

- Standalone components, Signals y `computed()`, `inject()`, `input()` y `output()`, `@if` y `@for`, `OnPush`, TypeScript estricto sin `any`.
- Limpieza correcta del temporizador.
- Retirada de `zone.js` (decisión D1).

**Calidad**

- Tests unitarios de dominio y casos de uso, y al menos un test de componente presentacional.
- Escenarios de borde y error, como una lista vacía o datos inválidos.

**Diseño sin implementación**

- Evolución hacia microfrontends y uso de NgRx, descritos en la sección 11.

### 2.2 Fuera del alcance

Cada cosa que dejo fuera tiene su motivo:

| Elemento | Motivo |
|---|---|
| Implementar Module o Native Federation | El reto solo pide su diseño |
| Implementar NgRx u otra librería de estado | El reto solo pide su diseño, y Signals cubre el estado de esta feature |
| Integración con una API real | El reto trabaja con un mock; el puerto `WorkoutRepository` permite añadirla sin cambiar el dominio |
| Persistencia del progreso | No forma parte de los criterios de aceptación |
| Enrutamiento | La feature tiene una sola pantalla |
| Internacionalización | No forma parte de los criterios de aceptación y la interfaz tiene un solo idioma (decisión D2) |
| Rediseño visual | Se conservan los estilos actuales, salvo lo necesario para los estados, el descanso, la barra de progreso y la jerarquía de los botones (decisión D9) |

## 3. Modelo de dominio

El dominio es TypeScript puro. No importa nada de Angular y no sabe lo que es un temporizador real: para él, el tiempo avanza cuando alguien llama a `tick`. La sesión se modela como una **máquina de estados inmutable**, así que cada operación recibe una sesión y devuelve otra nueva en vez de modificarla.

### 3.1 Tipos

```ts
interface Exercise {
  readonly name: string;
  readonly repetitions: number;
  readonly repetitionSeconds: number;
  readonly restSeconds: number;
}

type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';
type Phase = 'repetition' | 'rest';
type ExerciseStatus = 'pending' | 'in-progress' | 'completed';
type SessionEvent =
  | 'rest-started'
  | 'repetition-started'
  | 'exercise-completed'
  | 'workout-completed';

interface WorkoutSession {
  readonly exercises: readonly Exercise[];
  readonly status: SessionStatus;
  readonly currentIndex: number;
  readonly phase: Phase;
  readonly remainingSeconds: number;
  readonly completedRepetitions: number;
  readonly lastEvent: SessionEvent | null;
}
```

`lastEvent` guarda la última transición importante, por ejemplo que acaba de empezar un descanso. Qué texto mostrar en ese caso lo decide `presentation` (decisión D2).

### 3.2 Invariantes

Una sesión solo se puede crear con datos válidos. Si algo no cuadra, se lanza un error de dominio y la sesión no llega a existir:

- La lista contiene al menos un ejercicio.
- Cada ejercicio tiene un nombre que no está vacío ni formado solo por espacios.
- `repetitions`, `repetitionSeconds` y `restSeconds` son enteros mayores o iguales a 1.

### 3.3 Operaciones

| Operación | Desde | Resultado |
|---|---|---|
| `createSession(exercises)` | — | `idle`, primer ejercicio, fase `repetition`, `remainingSeconds` igual a su `repetitionSeconds` |
| `start` | `idle`, `paused` | `running`, conservando el progreso |
| `pause` | `running` | `paused`, conservando el progreso |
| `reset` | Cualquiera | El mismo estado que `createSession` |
| `tick` | `running` | Avanza un segundo, según la sección 3.4 |

Si una operación llega en un estado que no le corresponde, la sesión se devuelve tal cual. Es una regla simple, pero es la que corrige el defecto `4 / 3` de la sección 1.4: pulsar Iniciar con la sesión en `finished` ya no hace nada.

### 3.4 Transiciones de `tick`

| Fase | `remainingSeconds` | Condición | Resultado | `lastEvent` |
|---|---|---|---|---|
| Cualquiera | Mayor que 1 | — | Resta un segundo | Sin cambios |
| `repetition` | 1 | — | Pasa a `rest` con `restSeconds` | `rest-started` |
| `rest` | 1 | Quedan repeticiones | Suma una repetición y vuelve a `repetition` con `repetitionSeconds` | `repetition-started` |
| `rest` | 1 | Última repetición, quedan ejercicios | Avanza `currentIndex`, reinicia `completedRepetitions` y pasa a `repetition` con el tiempo del siguiente ejercicio | `exercise-completed` |
| `rest` | 1 | Última repetición del último ejercicio | Suma la repetición, `status` pasa a `finished` y `remainingSeconds` a 0 | `workout-completed` |

Cada repetición termina con su descanso, también la última de cada ejercicio, porque el criterio de aceptación suma la repetición completada al terminar el descanso.

### 3.5 Estado de cada ejercicio

El estado de cada ejercicio no se guarda en ningún sitio: **se calcula** a partir de la sesión. Así es imposible que la lista diga una cosa y la sesión otra.

| Condición | `ExerciseStatus` |
|---|---|
| Sesión `idle` | `pending` para todos |
| Sesión `finished` | `completed` para todos |
| Índice menor que `currentIndex` | `completed` |
| Índice igual a `currentIndex` | `in-progress` |
| Índice mayor que `currentIndex` | `pending` |

## 4. Capas y contratos

### 4.1 Estructura

La feature queda organizada así:

```text
src/app/features/workout/
├─ domain/
│  ├─ exercise.ts
│  ├─ workout-session.ts
│  ├─ workout.errors.ts
│  └─ ports/
│     ├─ workout.repository.ts
│     └─ ticker.ts
├─ application/
│  ├─ load-workout.use-case.ts
│  └─ workout-session.store.ts
├─ infrastructure/
│  ├─ exercise.dto.ts
│  ├─ exercise.mapper.ts
│  ├─ mock-workout.repository.ts
│  └─ interval-ticker.ts
├─ presentation/
│  ├─ workout-page/
│  ├─ workout-timer/
│  ├─ exercise-list/
│  ├─ exercise-item/
│  ├─ workout-toast/
│  └─ workout.labels.ts
├─ testing/
│  └─ fake-ticker.ts
└─ workout.providers.ts
```

Cuando termine la migración, las carpetas legacy `components/` y `services/` desaparecen.

### 4.2 Reglas de dependencia

Las dependencias siempre apuntan hacia el dominio:

| Capa | Puede importar | No puede importar |
|---|---|---|
| `domain` | Nada externo | Angular, RxJS, otras capas |
| `application` | `domain`, Angular | `infrastructure`, `presentation` |
| `infrastructure` | `domain`, Angular | `application`, `presentation` |
| `presentation` | `application`, `domain`, Angular | `infrastructure` |

Queda una pregunta: si `presentation` no puede ver `infrastructure`, ¿quién conecta cada puerto con su implementación? Lo hace `workout.providers.ts`, la **raíz de composición**. Es el único archivo que conoce las implementaciones concretas, vive fuera de las cuatro capas y se registra en la configuración de la aplicación.

### 4.3 Puertos

```ts
abstract class WorkoutRepository {
  abstract getExercises(): Promise<readonly Exercise[]>;
}

abstract class Ticker {
  abstract start(onTick: () => void): void;
  abstract stop(): void;
}
```

Uso clases abstractas en lugar de interfaces por un motivo práctico: una interface desaparece al compilar, mientras que una clase abstracta sigue existiendo y Angular puede usarla como token de inyección. Así el dominio define sus puertos sin importar nada de Angular.

`getExercises` devuelve una `Promise` aunque hoy el mock responda al instante. El día que llegue una API real, el contrato será el mismo.

`Ticker` envuelve el reloj real. En los tests lo cambio por uno falso y avanzo el tiempo a mano, sin esperar segundos reales y sin depender de `fakeAsync` (decisión D1).

`Ticker` se registra una sola vez para toda la aplicación y admite un único consumidor. Hoy es suficiente, porque hay una sola pantalla de entrenamiento. Si en el futuro convivieran varias sesiones a la vez, cada una necesitaría su propio `Ticker`, ya que una podría detener el reloj de la otra.

### 4.4 Infraestructura

El DTO respeta el formato que llega de fuera, en `snake_case`, y se traduce al modelo de dominio en esta capa. Ninguna otra llega a verlo:

```ts
interface ExerciseDto {
  readonly exercise_name: string;
  readonly repetitions_number: number;
  readonly repetition_time: number;
  readonly rest_time: number;
}
```

| `ExerciseDto` | `Exercise` |
|---|---|
| `exercise_name` | `name` |
| `repetitions_number` | `repetitions` |
| `repetition_time` | `repetitionSeconds` |
| `rest_time` | `restSeconds` |

### 4.5 Aplicación

`LoadWorkoutUseCase` pide los ejercicios al repositorio y crea con ellos la sesión inicial. Si la carga falla o los datos no son válidos, deja que el error llegue a quien lo llamó, que es quien sabe qué mostrar.

`WorkoutSessionStore` guarda el estado en Signals y hace de puente entre el dominio y el `Ticker`. Lo proveo en el container, así que nace y muere con la pantalla, y al destruirse detiene el `Ticker`.

```ts
type LoadStatus = 'loading' | 'ready' | 'error';

class WorkoutSessionStore {
  readonly loadStatus: Signal<LoadStatus>;
  readonly session: Signal<WorkoutSession | null>;
  readonly exerciseStatuses: Signal<readonly ExerciseStatus[]>;

  load(): Promise<void>;
  start(): void;
  pause(): void;
  reset(): void;
}
```

Iniciar, pausar y reiniciar son métodos del store y no clases aparte, porque cada una sería una línea que solo llama al dominio (decisión D3).

## 5. Flujo de datos

La idea general es sencilla: los datos bajan y los eventos suben. Los componentes presentacionales reciben lo que muestran por `input()` y avisan de lo que pasa por `output()`. El único que habla con el store es el container.

```text
          click                 output()
Usuario ────────> Presentacional ───────> Container ───> Store ───> Dominio
                                                           │
   Vista <──────── Presentacional <─────── Container <─────┘
                       input()             signals
```

### 5.1 Al abrir la pantalla

1. `WorkoutPageComponent` llama a `store.load()`, y mientras tanto `loadStatus` vale `loading`.
2. `LoadWorkoutUseCase` le pide los ejercicios a `WorkoutRepository`.
3. El mock devuelve la lista en `snake_case` y el mapper la convierte a `Exercise`. A partir de aquí nadie vuelve a ver el DTO.
4. `createSession` valida los datos y crea la sesión en `idle`.
5. El store guarda la sesión y pasa a `ready`. La lista aparece con todo en Pendiente y nada empieza hasta que el usuario pulse Iniciar.

Si la carga falla o los datos no son válidos, el store pasa a `error` y la pantalla muestra un mensaje en lugar de la sesión.

Mientras la carga está en curso, el store la registra en `PendingTasks`. Sin `zone.js`, Angular solo espera el trabajo asíncrono que se le declara, así que esto mantiene la aplicación "inestable" hasta que llegan los datos, tanto si la carga sale bien como si falla. Es lo que permite que los tests y un eventual renderizado en servidor esperen a la sesión.

Si se vuelve a cargar con una sesión en marcha, el store detiene antes el `Ticker` y descarta la sesión anterior. Mientras llega la nueva no hay sesión, así que pulsar Iniciar no tiene efecto y el reloj no puede correr sobre una sesión que ya se reemplazó.

Hoy la pantalla carga una sola vez, al abrirse. Las cargas simultáneas, por ejemplo con un botón de reintentar pulsado varias veces, quedan fuera del alcance: si se añadieran, el store tendría que descartar las respuestas que lleguen tarde.

### 5.2 Cuando pasa un segundo

Este es el recorrido que más se repite, así que conviene que sea corto:

1. `IntervalTicker` dispara el callback que le pasó el store.
2. El store aplica `tick` y guarda la sesión nueva en su signal.
3. Los `computed()` que dependen de ella se recalculan solos.
4. El container entrega los valores nuevos por `input()` y Angular actualiza solo lo que cambió.

Si después de un `tick` la sesión ya no está en `running`, el store detiene el `Ticker`. Nadie tiene que acordarse de pararlo al terminar el entrenamiento.

### 5.3 Cuando el usuario pulsa un control

`WorkoutTimerComponent` emite un `output()` y el container llama al método del store que corresponda.

- **Iniciar:** aplica `start` y arranca el `Ticker`, pero solo si la sesión estaba en `idle` o `paused`. Así un doble clic no deja dos intervalos corriendo.
- **Pausar:** aplica `pause` y detiene el `Ticker`. La sesión conserva el tiempo y las repeticiones.
- **Reiniciar:** detiene el `Ticker` y aplica `reset`.

### 5.4 Notificaciones

El dominio solo deja constancia de lo que ocurrió en `lastEvent`. El container busca el texto en `workout.labels.ts` y se lo pasa a `WorkoutToastComponent`, que únicamente lo muestra. Como en la versión legacy, el mensaje se queda en pantalla hasta que lo reemplaza otro.

### 5.5 Al salir de la pantalla

El store se provee en el container, de modo que se destruye junto con él. En ese momento detiene el `Ticker` usando `DestroyRef`, y el intervalo no sigue vivo como pasaba antes.

## 6. Diseño de componentes

La pantalla se reparte entre un container y cuatro componentes presentacionales. El container es el único que sabe que existe un store. Los demás solo reciben datos y avisan de lo que pasa, así que se pueden entender, reutilizar y probar sin montar nada alrededor.

Todos los componentes son standalone, usan `ChangeDetectionStrategy.OnPush` y declaran sus entradas con `input.required()` cuando no tiene sentido renderizarlos sin ellas.

```text
WorkoutPageComponent (container)
├─ WorkoutTimerComponent
├─ WorkoutToastComponent
└─ ExerciseListComponent
   └─ ExerciseItemComponent (uno por ejercicio)
```

### 6.1 `WorkoutPageComponent`, el container

Provee `WorkoutSessionStore`, lo inyecta con `inject()` y llama a `load()` al crearse. Su trabajo es traducir el estado del store a lo que necesita cada componente hijo, y para eso usa `computed()`: busca los textos en `workout.labels.ts`, arma la lista de ejercicios con su estado y entrega al temporizador el estado de la sesión.

También se encarga de los estados de carga. Mientras `loadStatus` vale `loading` muestra un aviso de carga, y si vale `error` muestra un mensaje en lugar de la sesión.

### 6.2 Componentes presentacionales

Ninguno inyecta dependencias.

| Componente | Recibe (`input`) | Emite (`output`) | Qué hace |
|---|---|---|---|
| `WorkoutTimerComponent` | Nombre del ejercicio, fase y su etiqueta, segundos restantes, segundos de ejercicio y de descanso del ejercicio actual, repeticiones hechas y totales, estado de la sesión | `start`, `pause`, `reset` | Muestra el tiempo como `mm:ss`, la fase, el contador destacado y una barra segmentada con un tramo por repetición, y decide qué botones mostrar según la tabla 6.3 |
| `ExerciseListComponent` | Lista de ejercicios con su estado | — | Recorre la lista con `@for` |
| `ExerciseItemComponent` | Nombre, repeticiones, estado y su etiqueta | — | Muestra un ejercicio y marca su estado con una clase CSS |
| `WorkoutToastComponent` | Mensaje o `null` | — | Muestra la notificación, si la hay |

El formato `mm:ss` vive en una función pura de `presentation`, que el temporizador usa dentro de un `computed()`. Así se prueba por separado y el template no hace cuentas.

La notificación usa `role="status"`, para que un lector de pantalla anuncie cada mensaje sin interrumpir al usuario.

### 6.3 Controles disponibles

Se calculan a partir del estado de la sesión, igual que en la versión legacy: Iniciar se ve cuando la sesión no está corriendo y Pausar cuando sí lo está. Reiniciar está siempre visible.

| Sesión | Iniciar | Pausar | Reiniciar |
|---|---|---|---|
| `idle` | Visible | — | Visible |
| `running` | — | Visible | Visible |
| `paused` | Visible | — | Visible |
| `finished` | Visible y deshabilitado | — | Visible |

Al terminar, el temporizador muestra "Finalizado" en lugar de la fase, sin el estilo de descanso, aunque la sesión haya acabado con un descanso. Iniciar queda deshabilitado en lugar de desaparecer. El dominio ya ignora un `start` sobre una sesión terminada, pero así el usuario entiende que la sesión acabó y que para repetirla tiene que reiniciar.

## 7. Plan de implementación

La regla que guía el orden es que la app tiene que funcionar en cada commit. Por eso construyo de adentro hacia afuera: primero el dominio, que no toca nada de lo que existe, y al final la pantalla nueva, que es el único paso que cambia lo que ve el usuario. El componente legacy sigue funcionando hasta que su reemplazo está listo y probado.

Cada bloque se escribe con los tests primero: veo fallar el test, escribo lo mínimo para que pase y después ordeno el código. Ningún bloque se cierra sin que `npm run build` y `npm test` pasen.

| Bloque | Qué incluye | Cómo sé que está listo | ¿Cambia la app? |
|---|---|---|---|
| **W1. Dominio** | `Exercise`, `WorkoutSession` con sus operaciones, errores de dominio y los puertos | Tests de invariantes, operaciones y transiciones, incluido el ejemplo completo de la sección 3 | No |
| **W2. Infraestructura** | DTO, mapper, mock con una lista de ejercicios e `IntervalTicker` | Tests del mapper y del mock | No |
| **W3. Aplicación** | `LoadWorkoutUseCase` y `WorkoutSessionStore` | Tests con un repositorio y un `Ticker` falsos, incluidos los errores de carga | No |
| **W4. Presentación** | Textos, formato `mm:ss`, los cinco componentes y `workout.providers.ts`. `AppComponent` pasa a usar `WorkoutPageComponent` | Tests de al menos un componente presentacional y del formato de tiempo. Prueba manual en el navegador | **Sí** |
| **W5. Retirada del legacy** | Borrar `components/` y `services/`, y actualizar el test de `AppComponent` | Ningún archivo importa código legacy y los tests pasan | No |
| **W6. Zoneless** | `provideZonelessChangeDetection()` y eliminación de `zone.js` (decisión D1) | Build y tests sin `zone.js`, prueba manual y comparación del tamaño del build | No |
| **W7. Cierre** | Evidencia de build y tests en la sección 10 y README actualizado | La spec refleja lo que realmente se construyó | No |

W4 es el bloque más grande y el único con riesgo visible, así que puede repartirse en varios commits: primero los componentes presentacionales con sus tests, y después el container y la conexión con `AppComponent`.

Mientras duren W1 a W4 conviven dos componentes `WorkoutTimerComponent`, el legacy y el nuevo. Están en carpetas distintas y la app solo importa uno a la vez, así que no chocan. W5 elimina el legacy.

`strict` ya está activo en `tsconfig.json`, pero no impide escribir `any` de forma explícita. Para cumplir con "sin `any`", cada bloque revisa que no aparezca en el código nuevo, y al cerrar W5 no debe quedar ninguno en el proyecto.

## 8. Criterios de aceptación

Un criterio solo sirve si se puede comprobar, así que cada uno indica dónde se verifica. Casi todos quedan cubiertos por tests automáticos. La prueba manual en el navegador queda para lo puramente visual.

### 8.1 Criterios del reto

Copio los criterios tal como aparecen en `docs/CHALLENGE.md`. El último lo separo en dos porque son dos comportamientos distintos.

| ID | Criterio | Cómo se comprueba |
|---|---|---|
| CA1 | Al cargar, todos los ejercicios están pendientes y la sesión no inicia sola. | Test de dominio sobre `createSession` y test del store tras `load()` |
| CA2 | Iniciar activa el primer ejercicio y su `repetition_time`. | Test de dominio sobre `start` |
| CA3 | Al llegar a cero se inicia descanso con `rest_time`. | Test de dominio sobre `tick` |
| CA4 | Al terminar descanso se incrementa la repetición completada. | Test de dominio sobre `tick` |
| CA5 | Al completar repeticiones, el ejercicio se completa y arranca el siguiente. | Test de dominio sobre `tick` y sobre el estado derivado de cada ejercicio |
| CA6 | Al completar el último ejercicio, el entrenamiento finaliza. | Test de dominio con el ejemplo completo de la sección 3 |
| CA7 | Pausar conserva progreso. | Tests de dominio y del store: tras pausar, un `tick` no cambia nada y al reanudar se sigue desde el mismo punto |
| CA8 | Reiniciar vuelve al estado inicial. | Tests de dominio y del store desde cada estado de la sesión |

Sobre CA3 conviene aclarar cómo lo interpreto. "Llegar a cero" es el momento en que se agota el último segundo, y en ese mismo instante empieza el descanso. Por eso la pantalla pasa de `00:01` directamente al tiempo de descanso, sin quedarse un segundo en `00:00`. La versión legacy se comporta igual.

### 8.2 Comportamientos añadidos

Salen de los defectos de la sección 1.4 y de las decisiones de diseño.

| ID | Criterio | Cómo se comprueba |
|---|---|---|
| CA9 | Con el entrenamiento terminado, Iniciar está deshabilitado y un `start` no cambia la sesión | Test de dominio y test del componente del temporizador |
| CA10 | El tiempo se muestra como `mm:ss`, por ejemplo 90 segundos como `01:30` | Test de la función de formato |
| CA11 | La fase de descanso se distingue visualmente de la de ejercicio | Prueba manual |
| CA12 | La notificación cambia al empezar un descanso, al volver al ejercicio, al completar un ejercicio y al terminar el entrenamiento | Test de dominio sobre `lastEvent` y prueba manual |
| CA13 | Pulsar Iniciar dos veces seguidas no acelera el temporizador | Test del store con un `Ticker` falso |
| CA14 | Al salir de la pantalla, el temporizador se detiene | Test del store al destruirse |
| CA15 | Si la lista está vacía o trae datos inválidos, se muestra un mensaje de error en lugar de la sesión | Tests de dominio y del caso de uso |
| CA16 | Si la carga falla, se muestra un mensaje de error | Test del caso de uso y del store |
| CA21 | Una barra segmentada, con un tramo por repetición del ejercicio actual, muestra el avance: los tramos completados están llenos, el actual se llena cada segundo y se completa exactamente al cerrar su repetición, y la barra vuelve a empezar en el siguiente ejercicio. El contador "1 / 3" se muestra destacado como título de la barra | Tests del temporizador y del container |

### 8.3 Criterios técnicos

| ID | Criterio | Cómo se comprueba |
|---|---|---|
| CA17 | `domain` no importa Angular, y `presentation` no importa `infrastructure` | Búsqueda de imports en cada capa |
| CA18 | No queda ningún `any` en el proyecto | Búsqueda en `src/` |
| CA19 | Los componentes presentacionales no inyectan dependencias y todos los componentes usan `OnPush` | Revisión del código y test del componente presentacional |
| CA20 | `npm run build` y `npm test` pasan sin `zone.js` | Ejecución de ambos comandos, registrada en la sección 10 |

## 9. Estrategia de testing

La arquitectura está pensada para que lo importante se pueda probar sin Angular. Por eso la mayoría de los tests caen sobre el dominio: son funciones puras, corren en milisegundos y no necesitan montar nada. A medida que se sube de capa hay menos tests, porque cada capa solo tiene que probar lo que agrega.

Uso lo que el proyecto ya trae: Jasmine, Karma y `karma-coverage`. Cambiar de herramienta no aporta nada a lo que pide el reto.

### 9.1 Qué se prueba en cada capa

| Capa | Qué se prueba | Cómo |
|---|---|---|
| `domain` | Invariantes, operaciones, cada fila de la tabla de transiciones, el estado derivado de los ejercicios y el ejemplo completo de la sección 3 | Llamadas directas a las funciones, sin TestBed |
| `infrastructure` | Que el mapper traduce cada campo del DTO y que el mock devuelve una lista válida | Llamadas directas |
| `application` | Carga correcta y con error, controles, parada del `Ticker` al terminar o al destruirse, doble clic en Iniciar | TestBed con un repositorio y un `Ticker` falsos |
| `presentation` | Que cada componente presentacional muestra lo que recibe y emite sus eventos, y el formato `mm:ss` | TestBed para los componentes, llamadas directas para el formato |

### 9.2 Dobles de prueba

Los puertos de la sección 4.3 son los que permiten reemplazar las piezas difíciles de probar:

- **`Ticker` falso:** guarda el callback y expone un método para disparar un tick a mano. Con él, un test recorre un entrenamiento completo sin esperar ni un segundo real y sin `fakeAsync`.
- **Repositorio falso:** devuelve una lista fija o una promesa rechazada, según el caso que se quiera probar.

### 9.3 Componentes y zoneless

En los tests de componentes paso los datos con `fixture.componentRef.setInput()`, activo `fixture.autoDetectChanges()` y espero el render con `await fixture.whenStable()`. Con `zone.js`, `whenStable()` por sí solo no ejecuta la detección de cambios, y el primer test de componente falló justamente por eso. Con la detección automática activada, los tests funcionan igual con `zone.js` y sin él, de modo que el bloque W6 no obliga a reescribirlos. En W6 se quitaron `zone.js` y `zone.js/testing` de los `polyfills` de test, y `src/zoneless-testing.spec.ts` agrega `provideZonelessChangeDetection()` a todos los TestBed con un `beforeEach` global. Así los tests corren en el mismo modo que la app, y ningún test nuevo puede olvidarse de configurarlo.

`testing/fake-ticker.ts` contiene el `Ticker` falso. Lo comparten los tests del store y del container, y queda fuera de las cuatro capas porque solo existe para probar.

### 9.4 Trazabilidad y cobertura

Cada test nombra el criterio de la sección 8 que cubre, por ejemplo `it('CA4: adds a completed repetition when the rest ends', ...)`. Los nombres de los tests están en inglés, igual que el resto del código. Así es fácil comprobar que no quedó ningún criterio sin test.

La cobertura se mide con `ng test --code-coverage` y se registra en la sección 10. No fijo un porcentaje como meta, porque se puede tener mucha cobertura y aun así dejar sin probar lo que importa. La meta real es que cada criterio automatizable tenga su test.

## 10. Evidencia de build y tests

Todo lo de esta sección se obtuvo en la rama `refactor/workout-architecture`, sobre el commit `aac8343`.

### 10.1 Comandos

| Comando | Resultado |
|---|---|
| `npm run build` | Compila sin errores ni avisos |
| `npm test` | 109 tests en verde, sin avisos en consola |
| `npx ng test --watch=false --code-coverage` | Cobertura de la sección 10.2 |
| `npm start` | La app arranca en `http://localhost:4200` |

### 10.2 Cobertura

| Métrica | Resultado |
|---|---|
| Sentencias | 99,4 % (167 de 168) |
| Ramas | 93,02 % (40 de 43) |
| Funciones | 100 % (51 de 51) |
| Líneas | 99,35 % (155 de 156) |

Lo que queda sin cubrir son tres comprobaciones defensivas para cuando todavía no hay sesión: el valor vacío de `exerciseStatuses` en el store y dos `computed()` del container. El template solo muestra esos datos cuando la sesión existe, así que la interfaz no puede llegar a esas ramas. No agregué tests artificiales para ellas, porque la meta de la sección 9.4 es cubrir los criterios, no el porcentaje.

### 10.3 Criterios técnicos

| ID | Comprobación | Resultado |
|---|---|---|
| CA17 | Imports de Angular en `domain` / imports de `infrastructure` en `presentation` o `application` | 0 / 0 |
| CA18 | `any` en todo `src/` | 0 |
| CA19 | Componentes con `OnPush` / componentes presentacionales que inyectan dependencias | 6 de 6 / 0 (solo el container usa `inject()`) |
| CA20 | Build y tests sin `zone.js` | Pasan, sin avisos `NG0908` ni `NG0914` |

Los criterios funcionales CA1 a CA16 tienen cada uno al menos un test que lleva su ID en el nombre (sección 9.4). CA11 se comprobó además en el navegador, donde la fase de descanso aplica la clase `phase--rest`.

### 10.4 Tamaño del build (decisión D1)

| | Con `zone.js` (`8372c1c`) | Sin `zone.js` (`aac8343`) | Diferencia |
|---|---|---|---|
| `main.js` | 128,66 kB | 129,02 kB | +0,36 kB |
| `polyfills.js` | 34,59 kB | — | Eliminado |
| Total inicial | 163,64 kB | 129,41 kB | −21 % |
| Total transferido | 49,77 kB | 38,49 kB | **−23 %** |

### 10.5 Comprobaciones en el navegador

Además de los tests, cargué la app en Chrome sin interfaz gráfica en tres momentos:

| Prueba | Resultado |
|---|---|
| Componente legacy en modo zoneless, tras pulsar Start (antes del refactor) | El temporizador se queda en `00:05` |
| App nueva, pantalla inicial | Squats, `00:05`, `0 / 3`, tres ejercicios en Pendiente |
| App nueva en modo zoneless, unos 6,5 s después de pulsar Iniciar | Descanso, `00:02`, "Tiempo de descanso", En curso / Pendiente / Pendiente |

### 10.6 Revisión de código

Cada tramo de código pasó por una revisión de fiabilidad antes de continuar, y todas terminaron aprobadas. Sus observaciones se resolvieron así:

| Observación | Qué se hizo |
|---|---|
| Un ejercicio sin nombre pasaba la validación | Corregido (`2f29f93`, `7e954c0`) |
| El reloj seguía activo al recargar | Corregido (`075b05f`, `b8fe84b`) |
| La pantalla final mostraba "Descanso 00:00" | Corregido (`824ad16`) |
| Las cargas simultáneas pueden pisarse | Fuera de alcance, documentado en la sección 5.1 (`8372c1c`) |
| `Ticker` es único para toda la app | Limitación aceptada, documentada en la sección 4.3 y en la decisión D5 |

### 10.7 Historial

| Etapa | Commits |
|---|---|
| Código original | `1ab1c9a` |
| Reparación de la base | `4b73a4f` a `eb1ed61`, marcado con el tag `legacy-baseline` |
| Spec | `8c69940` a `3aa9e48` |
| W1. Dominio | `162fd2b` a `74b04b6` |
| W2. Infraestructura | `8511402`, `e5edf86` |
| W3. Aplicación | `8c131a1`, `814d272` |
| W4. Presentación | `a197766`, `23c5eb4` a `f2f53c8` |
| W5. Retirada del legacy | `6ec0966` |
| W6. Zoneless | `0bc354b` a `aac8343` |

### 10.8 Actualización: barra de progreso y botones (CA21, D8 y D9)

Medido en la rama `feat/repetition-progress`, después de añadir la barra de la decisión D8 y la jerarquía de botones de la decisión D9.

| Comprobación | Resultado |
|---|---|
| `npm test` | 118 tests en verde |
| Cobertura | 99,44 % de sentencias (180 de 181), 93,87 % de ramas (46 de 49), 100 % de funciones (55 de 55), 99,4 % de líneas (167 de 168) |
| Total transferido | 39,30 kB, 0,81 kB más que antes de la barra y los botones |
| Contraste de los botones | Texto blanco sobre azul: 4,63:1, por encima del 4,5:1 de WCAG AA |
| Navegador, pantalla inicial | Iniciar en azul como acción principal y Reiniciar con borde como secundaria |
| Navegador, al terminar | Todos los tramos en verde, contador "2 / 2" e Iniciar deshabilitado en gris |
| Navegador, segunda repetición de Squats | Contador "1 / 3", primer tramo completo en verde, segundo al 38 % y tercero vacío |
| Navegador, al pasar a Push-ups | Contador "0 / 2" y dos tramos vacíos |

## 11. Extensión: microfrontends y NgRx

Esta sección es solo de diseño. Describe cómo evolucionaría la feature si tuviera que vivir dentro de una plataforma más grande, repartida entre varios equipos. Nada de esto se implementa en el reto.

### 11.1 Shell y remotes

Imagino una plataforma de entrenamiento con varias áreas, cada una a cargo de un equipo y con su propio despliegue:

- **Shell (host):** el marco común. Se encarga del layout, la navegación, la autenticación y de cargar cada remote cuando el usuario entra en su ruta.
- **Remote `workout`:** esta feature. Expone sus rutas, con `WorkoutPageComponent` como punto de entrada, y el shell la carga de forma diferida con `loadChildren`.
- **Otros remotes posibles:** por ejemplo, historial de entrenamientos o perfil. Los menciono para mostrar dónde están los límites, no porque formen parte del diseño.

La arquitectura por capas ayuda mucho aquí: el remote `workout` ya es una unidad cerrada, con su dominio, sus puertos y su raíz de composición. Convertirlo en remote es sobre todo cambiar cómo se publica.

### 11.2 Native Federation o Module Federation

Elegiría **Native Federation**. Module Federation depende de webpack, mientras que este proyecto compila con `@angular/build:application`, el builder basado en esbuild que Angular usa por defecto. Native Federation trabaja sobre módulos ES estándar e import maps, así que encaja con ese builder sin cambiarlo.

El shell lee un manifiesto con la URL de cada remote. Cambiar esa URL por entorno permite desplegar cada remote por separado sin volver a compilar el shell.

### 11.3 Dependencias compartidas

- **Compartidas como singleton:** `@angular/core`, `@angular/common`, `@angular/router` y `rxjs`. Tiene que haber una sola instancia de Angular en la página, porque dos instancias significan dos inyectores y servicios duplicados.
- **Misma versión mayor de Angular en todos los remotes,** con la compatibilidad de versiones declarada de forma estricta, para que un desajuste falle al arrancar en lugar de producir errores difíciles de rastrear.
- **No compartido:** el dominio de `workout`. Es lógica de un solo equipo, y compartirlo crearía un acoplamiento justo donde los microfrontends buscan independencia.

### 11.4 Estado local y compartido

La regla que seguiría es que cada remote es dueño de su estado y solo se comparte lo que de verdad pertenece a toda la plataforma.

| Estado | Dónde vive | Motivo |
|---|---|---|
| Sesión de entrenamiento: tiempo, fase, ejercicio actual | Local en el remote, en `WorkoutSessionStore` | Solo le importa a esta pantalla y cambia cada segundo |
| Usuario autenticado y preferencias | Shell, expuesto a los remotes | Lo necesitan todos |
| Aviso de "entrenamiento terminado" | Evento publicado por el remote | Otro remote, como el historial, puede reaccionar sin que `workout` sepa que existe |

Para ese último caso prefiero un evento con un contrato tipado en una librería compartida antes que un store global. Así los remotes se comunican sin depender del estado interno de los demás.

### 11.5 Cuándo usaría NgRx

En esta feature no lo usaría. El estado es local, lo modifica una sola pantalla y Signals lo resuelve con menos código. NgRx tendría sentido si el estado se compartiera entre varias features o remotes, si hubiera flujos asíncronos complejos que coordinar, o si el equipo necesitara las Redux DevTools para seguir cada cambio.

Si llegara ese momento, la migración sería directa, porque el dominio ya está escrito como funciones puras que reciben un estado y devuelven otro, que es justamente lo que hace un reducer:

| Pieza de NgRx | Qué contendría | Equivalente actual |
|---|---|---|
| **Actions** | `[Workout Page] Start`, `Pause`, `Reset`, `[Workout Timer] Tick`, `[Workout API] Exercises Loaded` y `Load Failed` | Los métodos del store y el callback del `Ticker` |
| **Reducer** | Delega en `start`, `pause`, `reset` y `tick` del dominio | Las mismas funciones, sin cambios |
| **Selectors** | Estado de cada ejercicio, tiempo restante, controles disponibles | Los `computed()` |
| **Effects** | La carga a través de `WorkoutRepository` y el intervalo que despacha `Tick` | `LoadWorkoutUseCase` y el `Ticker` |
| **Store** | El estado de la feature, registrado con `provideState` | `WorkoutSessionStore` |

Hay un paso intermedio que también consideraría: **NgRx SignalStore**, que mantiene la API basada en Signals y se parece mucho al store actual. Sería la opción natural si se quisieran las convenciones de NgRx sin adoptar todo el patrón Redux.

## 12. Registro de decisiones

### D1. Retirada progresiva de `zone.js`

**Contexto.** En Angular 20 la detección de cambios usa `zone.js` por defecto, y el modo zoneless es estable desde la versión 20.2 mediante `provideZonelessChangeDetection()`. El componente legacy modifica variables normales dentro de un `setInterval`, lo que no notifica a Angular.

**Evidencia.** Se ejecutó el componente legacy en una copia temporal, pulsando Start y observando la pantalla unos 3,5 segundos después:

| Modo | Temporizador |
|---|---|
| Con `zone.js` | `00:02`, avanza |
| Zoneless | `00:05`, congelado |

**Decisión.** Mantener `zone.js` mientras exista el componente legacy y escribir el código nuevo con Signals, sin depender de él. Al retirar el componente legacy, activar `provideZonelessChangeDetection()` y eliminar `zone.js` de las dependencias y de `polyfills`.

**Justificación.**

- La aplicación funciona en cada commit durante la migración.
- La reactividad queda explícita: la vista se actualiza porque cambia un signal, no por una intercepción global de APIs del navegador.
- Se elimina una dependencia que modifica APIs globales y se reduce el código que se envía al navegador.

**Costos.** Los tests de componentes no podrán usar `fakeAsync`, que depende de `zone.js`. La lógica del temporizador se probará en TypeScript puro, por lo que no lo necesita.

**Validación.** La retirada se completó en W6. El total transferido bajó de 49,77 kB a 38,49 kB, un 23 % menos, y los tests corren sin `zone.js` (sección 10.4). `zone.js` sigue apareciendo en `package-lock.json` solo como dependencia opcional de `@angular/core`, pero no se carga en la app ni en los tests, y el bundle no contiene nada de él.

### D2. Textos de interfaz centralizados, sin i18n

**Contexto.** La aplicación legacy muestra sus textos en inglés, mientras que el reto nombra los estados y controles en español: Pendiente, En curso, Completado, Iniciar, Pausar y Reiniciar. El reto no pide soporte para varios idiomas.

**Decisión.** Mostrar la interfaz en español y centralizar sus textos en un archivo de la capa `presentation`. El dominio expresa los conceptos con valores técnicos sin idioma, como `'pending'`, `'in-progress'` y `'completed'`, y la presentación los convierte en etiquetas.

**Alternativas descartadas.**

| Alternativa | Motivo |
|---|---|
| `@angular/localize` | Añade configuración y un build por idioma para una aplicación con un solo idioma |
| Transloco u otra librería de traducción | Añade una dependencia sin un requisito que la justifique |
| Textos directos en cada template | Repite los textos y los dispersa entre componentes |

**Justificación.**

- Los tests del dominio no dependen de los textos visibles.
- `Record<ExerciseStatus, string>` hace que el compilador exija una etiqueta por cada estado.
- Si en el futuro se requiere i18n, el cambio se limita a la capa `presentation`.

**Costos.** Cambiar los textos actuales de la interfaz. No altera el comportamiento.

### D3. Controles de la sesión como métodos del store

**Contexto.** El reto pide orquestar casos de uso. Cargar el entrenamiento accede a un puerto y crea la sesión, mientras que iniciar, pausar y reiniciar solo delegan en funciones puras del dominio.

**Decisión.** `LoadWorkoutUseCase` es una clase propia. Iniciar, pausar y reiniciar son métodos de `WorkoutSessionStore`, que además coordina el `Ticker`.

**Alternativa descartada.** Una clase por acción coincide literalmente con el término "caso de uso", pero serían clases de una línea que añaden indirección sin aportar comportamiento.

**Justificación.** Todo el flujo de la sesión se lee en un solo lugar, y esos métodos se prueban igual que un caso de uso.

**Costos.** Si los controles ganaran reglas propias, habría que extraerlos a casos de uso independientes.

### D4. La carga se declara como tarea pendiente

**Contexto.** Al pasar a zoneless, el test de `AppComponent` falló. Sin `zone.js`, Angular solo considera pendiente el trabajo asíncrono que se le declara, así que `whenStable()` terminaba antes de que llegaran los ejercicios.

**Decisión.** `load()` registra la carga en `PendingTasks` y la libera en un `finally`, tanto si sale bien como si falla.

**Justificación.** Es la práctica que recomienda Angular para zoneless. Además de los tests, la necesitaría un renderizado en servidor, que también espera a que la app esté estable.

### D5. Un único `Ticker` para la aplicación

**Contexto.** El store se crea uno por pantalla, mientras que `IntervalTicker` se registra una sola vez en la raíz de composición.

**Decisión.** Mantener un `Ticker` único y documentar que admite un solo consumidor (sección 4.3).

**Alternativa descartada.** Proveer un `Ticker` por pantalla obligaría al container a conocer `IntervalTicker`, lo que rompe la regla de que `presentation` no importa `infrastructure`, o a añadir una fábrica intermedia para un caso que hoy no existe.

### D6. El temporizador decide qué controles mostrar

**Contexto.** La primera versión de la sección 6 asignaba esa decisión al container.

**Decisión.** El container entrega el estado de la sesión y `WorkoutTimerComponent` aplica la tabla 6.3.

**Justificación.** La regla queda probada en el mismo componente que la aplica, y el container se limita a traducir datos.

### D7. "Finalizado" se resuelve en la presentación

**Contexto.** Al terminar, la sesión conserva la fase `rest` del último descanso, y la pantalla mostraba "Descanso 00:00".

**Decisión.** El container muestra "Finalizado" cuando la sesión terminó, y el temporizador no aplica el estilo de descanso en ese caso. El dominio no cambia.

**Justificación.** Para el dominio, la fase de una sesión terminada no tiene significado. Lo que mostrar en pantalla es responsabilidad de la presentación.

### D8. Barra de progreso de repeticiones

**Contexto.** Después de la primera entrega, al probar la app, la interfaz se sentía demasiado sencilla. El avance de las repeticiones solo se veía como el texto "1 / 3".

**Decisión.** Una barra segmentada, con un tramo por repetición del ejercicio actual, y el contador "1 / 3" destacado como título de la barra. La cantidad de tramos ya muestra cuántas repeticiones hay, y su estado muestra cuántas van:

- Los tramos de las repeticiones completadas están llenos, en verde.
- El tramo de la repetición en curso se llena cada segundo, en azul.
- Los tramos siguientes están vacíos.

```text
relleno del tramo actual = segundos transcurridos del ciclo / segundos del ciclo
```

El ciclo de una repetición es su tiempo de ejercicio más su descanso, porque la repetición se cuenta al terminar el descanso. Por eso el tramo se completa exactamente cuando el contador pasa, por ejemplo, de "0 / 3" a "1 / 3".

Se calcula en la presentación con datos que la sesión ya tiene, así que el dominio no cambia. La barra usa `role="progressbar"` con `aria-valuenow`, `aria-valuemax` y `aria-valuetext`. Para un lector de pantalla, el valor son las repeticiones enteras, por ejemplo "1 de 3", porque anunciar un porcentaje cada segundo sería ruido.

**Alternativas descartadas.**

| Alternativa | Motivo |
|---|---|
| Barra continua a saltos por repetición | Fue la primera versión. Se veía estática varios segundos y luego saltaba un tercio de golpe |
| Barra continua que avanza por segundos | Fue la segunda versión. Mejoraba el movimiento, pero el contador seguía siendo una línea de texto poco visible |
| Contador grande sin barra, o puntos por repetición | Más visible, pero suma un elemento aparte en lugar de unir el conteo y el avance |
| Progreso del tiempo de la fase actual | Repite la información del reloj y se vacía en cada fase, sin mostrar el avance del ejercicio |
| Progreso del entrenamiento completo | Mezcla ejercicios con distinto número de repeticiones y es menos claro para el usuario |

**Limitación.** Con muchas repeticiones, por ejemplo más de 15, los tramos quedarían muy finos. Con los ejercicios actuales, de 2 y 3 repeticiones, no ocurre. Si hiciera falta, la barra podría volver a ser continua a partir de cierto número de repeticiones.

### D9. Jerarquía visual de los controles

**Contexto.** Los tres botones usaban el estilo por defecto del navegador, así que Reiniciar, que borra todo el progreso, pesaba visualmente lo mismo que la acción principal.

**Decisión.** Iniciar y Pausar se muestran como acción principal, en azul con texto blanco (contraste 4,63:1, por encima del 4,5:1 de WCAG AA). Reiniciar se muestra como acción secundaria, con borde y sin relleno. Todos tienen un foco visible al navegar con teclado. Los estilos viven dentro del temporizador, sin tocar el CSS global.

**Justificación.** No es un rediseño: da jerarquía a las acciones y reduce el riesgo de reiniciar por error.
