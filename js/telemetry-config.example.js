/**
 * UPC TV - Telemetry Configuration Template
 * Copy this file to js/telemetry-config.js and insert your Neon credentials.
 * DO NOT commit js/telemetry-config.js to Git!
 */
(function (window) {
  'use strict';

  window.TELEMETRY_CONFIG = {
    // Neon Serverless SQL HTTP API endpoint
    endpoint: 'https://ep-broad-mode-ba2zewd1-pooler.c-8.eu-central-1.aws.neon.tech/sql',
    // Neon connection string (Recommended: use a restricted user with only INSERT permission)
    connectionString: 'postgresql://<USER>:<PASSWORD>@<HOST>/<DATABASE>?sslmode=require'
  };
})(window);
