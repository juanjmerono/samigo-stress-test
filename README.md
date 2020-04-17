# Samigo Stress Test

Realiza un test de carga sobre la realización de una prueba de la herramienta de exámenes de Sakai.

La prueba debe ser de preguntas de opción múltiple o subir fichero.

El test accede como administrador y suplanta a un usuario para acceder a un sitio determinado y buscar que haya un primer test disponible en la lista de exámenes. Si no lo hay espera ansiosamente a que lo haya refrescando la página.

Una vez que lo encuentra accede al test y lo rellena con respuestas aleatorias.

Por último entrega el test y termina haciendo logout de la plataforma.

Se puede configurar para matener cada usuario en un bucle en el que repita este ciclo sin parar para similar carga sostenida durante mucho tiempo.

## Configuración de datos de prueba

Lo ideal es configurar un examen con varias preguntas tipo test, una en cada página y con aleatoriedad.

Permitir que lo susuarios puedan entregar muchas veces la prueba para no tener que eliminar los datos generados por cada test.

## Ejecución del test

```
docker run --rm -v ${PWD}:/app -w /app loadimpact/k6 run script.js
```

O bien utilizando el script:

```
./runTests.sh << Ejecuta script.js
./runTests.sh test.js << Ejecuta test.js
```

## Creación del manifest para job de kubernetes

```
docker run --rm -it -v ${PWD}:/app nekottyo/kustomize-kubeval kustomize build -o manifest.yml
```

O bien utilizando el script:

```
./buildManifest.sh
```


