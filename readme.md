# framework2
---------------------
curl http://localhost:8000/health
---------------------
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
        "email": "test@example.com",
        "password": "123456",
        "name": "John Doe"
      }'

---------------------
      curl -X POST http://localhost:8000/users/login \
        -H "Content-Type: application/json" \
        -d '{
              "email": "test@example.com",
              "password": "123456"
            }'



---------------------
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer <JWT_TOKEN_HERE>"
