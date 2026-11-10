# Reto Técnico — Frontend Developer (Angular)

## 1. Contexto
`Workout Coach` es una aplicación Angular 20+ funcional, pero deliberadamente legacy: concentra lógica en un componente, usa `any`, estado mutable, temporizadores imperativos, directivas estructurales clásicas, inyección por constructor y mezcla presentación con negocio.

**El reto no es hacer que funcione: ya funciona.** Debes evolucionarla sin romper el comportamiento existente y dejar una arquitectura sostenible.

## 2. Desarrollo guiado por especificación (SDD)
Antes de escribir código crea una spec versionada, por ejemplo `docs/spec/workout-refactor.md`, con: contexto/problema; alcance y fuera de alcance; diseño propuesto; capas/contratos/modelo de dominio/flujo de datos; workstreams; criterios de aceptación; evidencia de build/tests. Si cambia el enfoque, actualiza la spec.

## 3. Clean Architecture
Reorganiza la feature en cuatro capas:
```text
src/app/features/workout/
├─ domain/
├─ application/
├─ infrastructure/
└─ presentation/
```
Reglas: `domain` es TypeScript puro; `application` depende de `domain`; `infrastructure` implementa puertos del dominio; `presentation` consume application/domain y no infrastructure directamente. El DTO externo conserva `snake_case` y debe mapearse en infrastructure. La lógica del temporizador/transiciones no debe vivir en el componente. Aplica inversión de dependencias mediante un puerto como `WorkoutRepository`.

## 4. Componentización Container / Presentational
Separa un container que orquesta casos de uso/estado de componentes presentacionales sin dependencias inyectadas, usando `input()`, `output()` y `ChangeDetectionStrategy.OnPush`. Como referencia: `WorkoutPageComponent`, `WorkoutTimerComponent`, `ExerciseListComponent`, `ExerciseItemComponent`, `WorkoutToastComponent`.

## 5. Feature: entrenamiento completo
El mock debe devolver una **lista de ejercicios**. La pantalla muestra la lista completa y la sesión avanza automáticamente entre ejercicios. Cada ejercicio muestra estado: Pendiente / En curso / Completado. Mantén temporizador de repetición/descanso, notificación, contador y controles Iniciar/Pausar/Reiniciar.

### Criterios de aceptación
- [ ] Al cargar, todos los ejercicios están pendientes y la sesión no inicia sola.
- [ ] Iniciar activa el primer ejercicio y su `repetition_time`.
- [ ] Al llegar a cero se inicia descanso con `rest_time`.
- [ ] Al terminar descanso se incrementa la repetición completada.
- [ ] Al completar repeticiones, el ejercicio se completa y arranca el siguiente.
- [ ] Al completar el último ejercicio, el entrenamiento finaliza.
- [ ] Pausar conserva progreso. Reiniciar vuelve al estado inicial.

## 6. Angular moderno
Usa, cuando corresponda: standalone components, Signals/`computed()`, `inject()`, `input()`/`output()`, `@if`/`@for`, OnPush, TypeScript estricto sin `any`, y limpieza correcta de timers/suscripciones.

## 7. Testing
Incluye tests unitarios del dominio y casos de uso, y al menos un test de componente presentacional. Cubre escenarios relevantes de borde/error.

## 8. Extensión técnica — diseño, no implementación obligatoria
Añade a tu spec una sección breve explicando cómo evolucionarías esta feature si debiera integrarse en una arquitectura de **microfrontends**. Describe: Shell/Host y Remote(s); estrategia Module/Native Federation; shared dependencies; límites de estado local/compartido; cuándo usarías NgRx/Redux y qué piezas (Store/Actions/Reducers/Effects/Selectors o equivalente). No es obligatorio implementar Federation/NgRx en el código del reto.

## 9. Entrega
Repositorio/fork/rama con historial completo; spec(s); código; tests; instrucciones de ejecución; evidencia de build/tests. Conventional Commits recomendado.

## 10. Alcance
Prioriza calidad sobre cantidad. Es preferible menos alcance bien especificado, arquitecturado y probado que una solución extensa sin proceso.
