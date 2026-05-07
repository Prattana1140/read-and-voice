FROM phpmyadmin:5.2-apache

COPY config.inc.php /etc/phpmyadmin/config.user.inc.php

RUN a2dismod -f mpm_event mpm_worker || true \
  && a2enmod mpm_prefork \
  && rm -f \
    /etc/apache2/mods-enabled/mpm_event.load \
    /etc/apache2/mods-enabled/mpm_event.conf \
    /etc/apache2/mods-enabled/mpm_worker.load \
    /etc/apache2/mods-enabled/mpm_worker.conf

CMD ["sh", "-c", "rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.* && exec apache2-foreground"]

EXPOSE 80
