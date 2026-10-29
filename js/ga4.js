(() => {
  const measurementId = "G-7GHS4H52VM";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.NinjalensAnalytics = {
    shopify: {
      csvFileLoaded(fileRole) {
        window.gtag("event", "shopify_csv_file_loaded", { file_role: fileRole });
      },
      csvSampleLoaded() {
        window.gtag("event", "shopify_csv_sample_load");
      },
      csvCompareClick(inputType) {
        window.gtag("event", "shopify_csv_compare_click", { input_type: inputType });
      },
      csvCheckerResult(inputType) {
        window.gtag("event", "shopify_csv_check_result", { input_type: inputType });
      },
      csvCheckerError(errorType) {
        window.gtag("event", "shopify_csv_check_error", { error_type: errorType });
      }
    }
  };
})();
