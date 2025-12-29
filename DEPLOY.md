# Инструкция по развертыванию плагина DWG reader

## Шаг 1: Создание репозитория на GitHub

1. Перейдите на https://github.com/new
2. Создайте новый репозиторий с именем `ru.topomatic.dwg`
3. Оставьте репозиторий публичным (Public)
4. НЕ инициализируйте с README, .gitignore или лицензией

## Шаг 2: Инициализация Git и загрузка кода

Выполните следующие команды в PowerShell:

```powershell
cd "c:\Users\bfate\YandexDisk\01_Разработка\00_Актуальное\Топоматик 360\DWG reader"

# Инициализация git репозитория
git init

# Добавление всех файлов
git add .

# Создание первого коммита
git commit -m "Initial commit: DWG reader plugin"

# Добавление удаленного репозитория (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ru.topomatic.dwg.git

# Отправка кода на GitHub
git branch -M main
git push -u origin main
```

## Шаг 3: Настройка GitHub Pages

1. Перейдите в настройки репозитория: Settings → Pages
2. В разделе "Source" выберите:
   - Branch: `main`
   - Folder: `/ (root)`
3. Нажмите "Save"
4. Подождите несколько минут, пока GitHub Pages развернется

## Шаг 4: Проверка работы

После развертывания плагин будет доступен по адресу:
```
https://YOUR_USERNAME.github.io/ru.topomatic.dwg/
```

## Шаг 5: Установка в Топоматик 360

### Способ 1: Через ссылку (рекомендуется)
Перейдите по ссылке:
```
https://360.topomatic.ru?extensionInstallPath=https://YOUR_USERNAME.github.io/ru.topomatic.dwg/
```

### Способ 2: Локальная установка
1. Скопируйте папку `dist` из проекта
2. В Топоматик 360 выберите "Установить плагин"
3. Укажите путь к папке `dist`

## Обновление плагина

После внесения изменений:

```powershell
# Пересобрать плагин
npm run build

# Добавить изменения
git add .

# Создать коммит
git commit -m "Update plugin"

# Отправить на GitHub
git push
```

GitHub Pages автоматически обновится через несколько минут.

## Альтернатива: Организация topomatic-code

Если у вас есть доступ к организации `topomatic-code`, создайте репозиторий там:
```
https://github.com/topomatic-code/ru.topomatic.dwg
```

Тогда ссылка для установки будет:
```
https://360.topomatic.ru?extensionInstallPath=https://topomatic-code.github.io/ru.topomatic.dwg/
```
