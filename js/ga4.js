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
      csvCheckerResult(inputType) {
        window.gtag("event", "checker_result", { input_type: inputType });
      },
      csvCheckerError(errorType) {
        window.gtag("event", "checker_error", { error_type: errorType });
      }
    }
  };
})();
