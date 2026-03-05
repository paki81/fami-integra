module.exports = {
  apps: [
    {
      name: 'fami-backend',
      script: 'src/index.js',
      cwd: '/var/www/html/integra/fami-integra/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/www/html/integra/fami-integra/logs/backend-error.log',
      out_file: '/var/www/html/integra/fami-integra/logs/backend-out.log',
      merge_logs: true
    },
    {
      name: 'fami-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      cwd: '/var/www/html/integra/fami-integra/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/www/html/integra/fami-integra/logs/frontend-error.log',
      out_file: '/var/www/html/integra/fami-integra/logs/frontend-out.log',
      merge_logs: true
    }
  ]
};
