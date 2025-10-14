# Используем Node.js 18
FROM node:18

# Установим рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем все зависимости
RUN npm install

# Копируем весь исходный код
COPY . .

# Открываем порт
EXPOSE 8000

# Команда для запуска сервера
CMD ["node", "index.js"]
