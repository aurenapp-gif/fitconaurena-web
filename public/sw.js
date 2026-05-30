/* Service worker de Fit con Aurena — SOLO notificaciones push.
 * No cachea nada ni intercepta navegación, así que no altera el funcionamiento
 * normal de la web ni la instalación PWA. Es puramente aditivo. */

self.addEventListener("push", (event) => {
  let data = { title: "Fit con Aurena", body: "Tienes una novedad", url: "/miembros" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/miembros" },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/miembros";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Si ya hay una pestaña abierta de la app, la enfocamos y navegamos.
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
