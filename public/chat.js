
// =====================================================
// CHAT SOCKET.IO
// =====================================================

var socket = io();


// =====================================================
// ELEMENTOS DEL HTML
// =====================================================

var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    botonAdjuntar = document.getElementById('adjuntar'),
    botonGrabar = document.getElementById('grabar'),
    inputArchivo = document.getElementById('archivo'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    ventana = document.getElementById('ventana-mensajes');


// =====================================================
// CONFIGURACIÓN
// =====================================================

var MAX_BYTES = 25 * 1024 * 1024;


// =====================================================
// SONIDO DE NOTIFICACIÓN
// =====================================================

var sonidoNotificacion =
    new Audio('/sonidos/s2.mp4');

sonidoNotificacion.volume = 0.7;

function sonido() {

    try {

        sonidoNotificacion.currentTime = 0;

        sonidoNotificacion.volume = 0.7;

        var reproduccion =
            sonidoNotificacion.play();

        if (reproduccion !== undefined) {

            reproduccion.catch(function () {

                console.log(
                    'El navegador bloqueó el sonido.'
                );

            });

        }

    } catch (e) {

        console.log(
            'No se pudo reproducir el sonido.'
        );

    }

}


// =====================================================
// NOTIFICACIONES
// =====================================================

var tituloOriginal = document.title;
var sinLeer = 0;

function notificar(titulo, cuerpo) {

    if (!document.hidden) {
        return;
    }

    sinLeer++;

    document.title =
        '(' + sinLeer + ') Nuevo mensaje';

    if (
        'Notification' in window &&
        Notification.permission === 'granted'
    ) {

        new Notification(titulo, {
            body: cuerpo
        });

    }

}


// =====================================================
// REGRESAR A LA PESTAÑA
// =====================================================

document.addEventListener(
    'visibilitychange',
    function () {

        if (!document.hidden) {

            sinLeer = 0;

            document.title =
                tituloOriginal;

        }

    }
);


// =====================================================
// ENVIAR MENSAJE
// =====================================================

function enviarMensaje() {

    var texto =
        mensaje.value.trim();

    if (texto) {

        socket.emit(
            'chat',
            {
                mensaje: texto,
                usuario: usuario.value
            }
        );

        socket.emit(
            'typing',
            {
                nombre: usuario.value,
                texto: ''
            }
        );

    }

    mensaje.value = '';

}


// =====================================================
// BOTÓN ENVIAR
// =====================================================

botonEnviar.addEventListener(
    'click',
    enviarMensaje
);


// =====================================================
// ENTER
// =====================================================

mensaje.addEventListener(
    'keyup',
    function (e) {

        if (e.key === 'Enter') {

            enviarMensaje();

            return;
        }

        if (persona.value) {

            socket.emit(
                'typing',
                {
                    nombre: usuario.value,
                    texto: mensaje.value
                }
            );

        }

    }
);


// =====================================================
// ARCHIVOS
// =====================================================

function enviarBlob(
    blob,
    nombre,
    tipo
) {

    if (blob.size > MAX_BYTES) {

        alert(
            'El archivo es demasiado grande. ' +
            'El máximo permitido es de 25 MB.'
        );

        return;
    }

    var reader =
        new FileReader();

    reader.onload =
        function () {

            socket.emit(
                'archivo',
                {
                    usuario: usuario.value,
                    nombre: nombre,
                    tipo:
                        tipo ||
                        'application/octet-stream',
                    buffer: reader.result
                }
            );

        };

    reader.readAsArrayBuffer(blob);

}


// =====================================================
// ADJUNTAR
// =====================================================

botonAdjuntar.addEventListener(
    'click',
    function () {

        inputArchivo.click();

    }
);


// =====================================================
// SELECCIONAR ARCHIVO
// =====================================================

inputArchivo.addEventListener(
    'change',
    function () {

        var file =
            inputArchivo.files[0];

        if (file) {

            enviarBlob(
                file,
                file.name,
                file.type
            );

        }

        inputArchivo.value = '';

    }
);


// =====================================================
// GRABAR AUDIO
// =====================================================

var grabador = null;
var trozos = [];
var flujo = null;

botonGrabar.addEventListener(
    'click',
    function () {

        if (
            grabador &&
            grabador.state === 'recording'
        ) {

            grabador.stop();

            return;
        }

        if (
            !navigator.mediaDevices ||
            !window.MediaRecorder
        ) {

            alert(
                'Tu navegador no permite grabar audio aquí. ' +
                'El micrófono funciona en localhost o HTTPS.'
            );

            return;
        }

        navigator.mediaDevices
            .getUserMedia({
                audio: true
            })
            .then(
                function (stream) {

                    flujo = stream;

                    trozos = [];

                    grabador =
                        new MediaRecorder(
                            stream
                        );

                    grabador.ondataavailable =
                        function (e) {

                            if (e.data.size) {

                                trozos.push(
                                    e.data
                                );

                            }

                        };

                    grabador.onstop =
                        function () {

                            flujo
                                .getTracks()
                                .forEach(
                                    function (t) {

                                        t.stop();

                                    }
                                );

                            botonGrabar
                                .classList
                                .remove(
                                    'grabando'
                                );

                            botonGrabar.textContent =
                                '🎤 Audio';

                            var tipo =
                                grabador.mimeType ||
                                'audio/webm';

                            var blob =
                                new Blob(
                                    trozos,
                                    {
                                        type: tipo
                                    }
                                );

                            var ext =
                                tipo.indexOf('ogg') !== -1
                                    ? 'ogg'
                                    :
                                (
                                    tipo.indexOf('mp4') !== -1
                                        ? 'm4a'
                                        : 'webm'
                                );

                            enviarBlob(
                                blob,
                                'nota-de-voz.' + ext,
                                tipo
                            );

                        };

                    grabador.start();

                    botonGrabar
                        .classList
                        .add('grabando');

                    botonGrabar.textContent =
                        '⏹ Enviar';

                }
            )
            .catch(
                function () {

                    alert(
                        'No se pudo acceder al micrófono. ' +
                        'Revisa el permiso del navegador.'
                    );

                }
            );

    }
);


// =====================================================
// AGREGAR MENSAJE
// =====================================================

function agregarMensaje(
    p,
    sonar,
    esPropio
) {

    // -------------------------------------------------
    // Animación dependiendo del usuario
    // -------------------------------------------------

    if (esPropio) {

        p.classList.add(
            'mensaje-enviado'
        );

    } else {

        p.classList.add(
            'mensaje-recibido'
        );

    }


    // -------------------------------------------------
    // Agregar animación
    // -------------------------------------------------

    p.classList.add(
        'mensaje-nuevo'
    );


    // -------------------------------------------------
    // Mostrar mensaje
    // -------------------------------------------------

    output.appendChild(p);


    // -------------------------------------------------
    // Scroll automático
    // -------------------------------------------------

    ventana.scrollTop =
        ventana.scrollHeight;


    // -------------------------------------------------
    // Sonido
    // -------------------------------------------------

    if (sonar) {

        sonido();

    }

}


// =====================================================
// RECIBIR MENSAJE DE TEXTO
// =====================================================

socket.on(
    'chat',
    function (data) {

        escribiendoMensaje.innerHTML =
            '';


        var p =
            document.createElement('p');


        var strong =
            document.createElement('strong');


        strong.textContent =
            data.usuario + ': ';


        p.appendChild(strong);


        p.appendChild(
            document.createTextNode(
                data.mensaje
            )
        );


        var esPropio =
            data.usuario === usuario.value;


        agregarMensaje(
            p,
            !esPropio,
            esPropio
        );


        if (!esPropio) {

            notificar(
                data.usuario,
                data.mensaje
            );

        }

    }
);


// =====================================================
// RECIBIR ARCHIVO
// =====================================================

socket.on(
    'archivo',
    function (data) {

        escribiendoMensaje.innerHTML =
            '';


        var blob =
            new Blob(
                [data.buffer],
                {
                    type: data.tipo
                }
            );


        var url =
            URL.createObjectURL(
                blob
            );


        var p =
            document.createElement('p');


        var strong =
            document.createElement('strong');


        strong.textContent =
            data.usuario + ': ';


        p.appendChild(strong);


        var esAudio =
            data.tipo.indexOf(
                'audio/'
            ) === 0;


        p.appendChild(
            document.createTextNode(
                (
                    esAudio
                        ? '🎤 '
                        : '📎 '
                ) +
                data.nombre
            )
        );


        // -------------------------------------------------
        // IMAGEN
        // -------------------------------------------------

        if (
            data.tipo.indexOf(
                'image/'
            ) === 0
        ) {

            var img =
                document.createElement(
                    'img'
                );

            img.src = url;

            p.appendChild(img);

        }


        // -------------------------------------------------
        // VIDEO
        // -------------------------------------------------

        else if (
            data.tipo.indexOf(
                'video/'
            ) === 0
        ) {

            var video =
                document.createElement(
                    'video'
                );

            video.src = url;

            video.controls = true;

            p.appendChild(video);

        }


        // -------------------------------------------------
        // AUDIO
        // -------------------------------------------------

        else if (esAudio) {

            var audio =
                document.createElement(
                    'audio'
                );

            audio.src = url;

            audio.controls = true;

            p.appendChild(audio);

        }


        // -------------------------------------------------
        // DESCARGA
        // -------------------------------------------------

        var a =
            document.createElement(
                'a'
            );

        a.href = url;

        a.download =
            data.nombre;

        a.className =
            'descarga';

        a.textContent =
            '⬇ Descargar';


        p.appendChild(
            document.createElement(
                'br'
            )
        );


        p.appendChild(a);


        // -------------------------------------------------
        // PROPIO / RECIBIDO
        // -------------------------------------------------

        var esPropio =
            data.usuario === usuario.value;


        agregarMensaje(
            p,
            !esPropio,
            esPropio
        );


        // -------------------------------------------------
        // NOTIFICACIÓN
        // -------------------------------------------------

        if (!esPropio) {

            notificar(
                data.usuario,
                (
                    esAudio
                        ? '🎤 Nota de voz'
                        : '📎 ' +
                          data.nombre
                )
            );

        }

    }
);


// =====================================================
// ESTÁ ESCRIBIENDO
// =====================================================

socket.on(
    'typing',
    function (data) {

        if (data.texto) {

            escribiendoMensaje.innerHTML =
                '';

            var p =
                document.createElement(
                    'p'
                );

            var em =
                document.createElement(
                    'em'
                );

            em.textContent =
                data.nombre +
                ' está escribiendo un mensaje...';

            p.appendChild(em);

            escribiendoMensaje.appendChild(
                p
            );

        } else {

            escribiendoMensaje.innerHTML =
                '';

        }

    }
);


// =====================================================
// ENTRAR AL CHAT
// =====================================================

function ingresarAlChat() {

    if (persona.value.trim()) {

        panelBienvenida.style.display =
            'none';

        appChat.style.display =
            'block';

        usuario.value =
            persona.value.trim();

        usuario.readOnly =
            true;


        // Pedir permiso de notificaciones
        if (
            'Notification' in window &&
            Notification.permission ===
                'default'
        ) {

            Notification.requestPermission();

        }

    }

}
