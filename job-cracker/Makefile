.PHONY: up down logs rebuild reseed psql clean

up:            ## build + start everything (http://localhost:8080)
	docker compose up -d --build

down:          ## stop containers, keep data
	docker compose down

logs:          ## tail all logs
	docker compose logs -f

rebuild:       ## force rebuild without cache
	docker compose build --no-cache && docker compose up -d

reseed:        ## re-import content (progress is preserved)
	RESEED=true docker compose up -d --force-recreate api

psql:          ## open a psql shell
	docker compose exec db psql -U jobcracker -d jobcracker

clean:         ## nuke containers AND the database volume
	docker compose down -v
