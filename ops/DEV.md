# Dev и production

Работа: feature → PR в dev → несколько согласованных изменений → PR dev в main. Default GitHub branch остаётся main: при открытии рабочего PR явно выбирать base dev. Для срочного исправления main полный UI обязателен независимо от имени head.

Dev: https://family.dev.taldav.com, отдельное вымышленное древо. Production: https://family.taldav.com, семейные данные. Не копировать реальные данные/аккаунты/токены в dev. Dev не является резервной копией. Проверки GitHub используют локальные fixtures и не обращаются даже к dev backend.

## Pipeline

PR в dev: build/lint/types, unit/integration, guards, desktop UI smoke. Push dev после merge: те же группы и полный desktop/mobile UI. PR в main и push main: полный набор. Все группы обязательны для CI gate. Push feature не запускает второй CI. Сборка ui-build содержит архив точных Git-исходников family-interface-source.tar.gz.

Dev защищена PR и актуальным CI gate, без обязательного второго ревьюера; админ-обход сохранён как main. Обычная работа через PR. Merge dev → main не публикует production: выпуск основного сайта только по отдельному поручению.

## Автопубликация

VPS забирает готовый артефакт раз в две минуты через systemd family-dev-publish.timer. Скрипт dev-publish.py исполняется локально от ubuntu с существующей gh-авторизацией, без Docker/root и без передачи SSH-ключа в GitHub Actions. Для минимизации прав при будущем выделении отдельного GitHub credential достаточно read contents/actions этого репозитория. Не выводить credentials в логи.

Публикуется только успешный CI workflow test.yml с event push, head_branch dev и SHA текущего refs/heads/dev. PR, workflow_dispatch, старый успешный SHA при новой незелёной dev не публикуются. Во время ожидания сайт сохраняет предыдущий успешный релиз. Запуск GitHub CI и развёртывание — два отдельных результата: зелёный gate ещё не доказывает готовность dev-сайта. Состояние публикации: published.json и journalctl.

Проверяются repository, размер архива/распаковки, пути, symlinks и необходимые файлы; никакие файлы сборки на сервере не исполняются. Новый current переключается атомарно; HTTPS index должен совпасть с артефактом, иначе возвращается предыдущий релиз. previous сохраняется. Хранятся текущий и предыдущий dev-релизы; новые публикации удаляют более старые сгенерированные dev-релизы. Исходная main-сборка может служить начальным релизом до первого успешного dev CI.

## Изоляция и эксплуатация

Runtime: /opt/sites/family-tree/dev-runtime. Отдельные Compose project family-tree-dev, network и volumes. Backend слушает только 127.0.0.1:5056; Nginx обслуживает static из current, /api/ проксирует только dev. Образы закреплены digest, установка не обновляет production. Dev web ограничен 768 MiB, worker 512 MiB, Valkey 64 MiB; сборки и тесты на VPS не запускать.

Шаблоны ops/dev-compose.yml, ops/dev-nginx.conf, ops/dev-publish.service и timer предназначены для установки администратором. Они не применяются автоматически из артефакта. Секреты и данные не хранить в checkout. Перед повторным применением проверить текущую конфигурацию. Новому хосту нужны DNS A/AAAA и отдельный HTTPS сертификат. До публичного открытия создать владельца через localhost. Dev secret/users volumes не должны пересекаться с production.

Проверки состояния (это не тестовые наборы):

```sh
systemctl status family-dev-publish.timer
journalctl -u family-dev-publish.service -n 30 --no-pager
cat /opt/sites/family-tree/dev-runtime/published.json
docker compose -f /opt/sites/family-tree/dev-runtime/compose.yaml ps
curl -I https://family.dev.taldav.com/
```

Для отката сначала остановить timer и дождаться/остановить текущий publisher; под блокировкой .publish.lock атомарно заменить current ссылкой на previous. Записать откат и оставить timer остановленным до решения о повторной публикации: его повторный запуск может вновь опубликовать текущую зелёную dev. Не изменять production compose и не удалять volumes.

Настройка dev pipeline должна попасть в GitHub до первого автодеплоя. Локальная подготовка не заменяет успешный CI и проверку нового HTTPS-сайта.
