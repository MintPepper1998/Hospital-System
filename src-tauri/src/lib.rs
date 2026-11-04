use tauri::Manager;
use tauri::Emitter;
use tauri::Listener;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Enable devtools in debug mode for troubleshooting
      #[cfg(debug_assertions)]
      {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Get the main window and configure it for staff kiosk use
      if let Some(window) = app.get_webview_window("main") {
        // Clear WebView2 cache on startup to avoid stale content issues
        let _ = window.clear_all_browsing_data();

        // Ensure fullscreen is activated
        let _ = window.set_fullscreen(true);

        // Inject JavaScript to block patient-facing routes
        // The web app's middleware already enforces role-based access,
        // but this adds a client-side layer to prevent staff from
        // accidentally navigating to patient pages
        let script = r#"
          (function() {
            const blockedPaths = ['/patient-login', '/book-appointment', '/contact'];
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            function checkAndRedirect() {
              const path = window.location.pathname;
              if (path === '/' || blockedPaths.some(p => path.startsWith(p))) {
                window.location.href = '/login';
              }
            }

            history.pushState = function() {
              originalPushState.apply(this, arguments);
              checkAndRedirect();
            };

            history.replaceState = function() {
              originalReplaceState.apply(this, arguments);
              checkAndRedirect();
            };

            window.addEventListener('popstate', checkAndRedirect);

            // Check on initial load
            checkAndRedirect();
          })();
        "#;
        let _ = window.eval(script);
      }

      // Listen for the "close_splashscreen" event from the frontend.
      // When the web content has loaded, close the splash and show the main window.
      let app_handle = app.handle().clone();
      app.listen("close_splashscreen", move |_event| {
        if let Some(splash) = app_handle.get_webview_window("splashscreen") {
          let _ = splash.close();
        }
        if let Some(main_window) = app_handle.get_webview_window("main") {
          let _ = main_window.show();
          let _ = main_window.set_focus();
        }
      });

      // FALLBACK: Also close the splashscreen after 6 seconds
      // just in case the remote frontend hasn't deployed the `SplashCloser` component yet.
      let fallback_handle = app.handle().clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(6));
        if let Some(splash) = fallback_handle.get_webview_window("splashscreen") {
          let _ = splash.close();
        }
        if let Some(main_window) = fallback_handle.get_webview_window("main") {
          let _ = main_window.show();
          let _ = main_window.set_focus();
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Shree Kamal Hospital");
}
