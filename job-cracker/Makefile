.PHONY: up dev dev-logs down logs rebuild reseed restart psql clean backup restore

# ---------------------------------------------------------------- production
up:            ## build + start everything (http://localhost:8080)
	docker compose up -d --build

restart:       ## rebuild and restart after code changes, re-importing content
	RESEED=true docker compose up -d --build

down:          ## stop containers, keep data
	docker compose down

logs:          ## tail all logs
	docker compose logs -f

rebuild:       ## force rebuild without cache
	docker compose build --no-cache && docker compose up -d

reseed:        ## re-import content (progress is preserved)
	RESEED=true docker compose up -d --force-recreate api

# --------------------------------------------------------------- development
# Source is bind-mounted and both services watch it, so saving a file is
# enough — no rebuild, no restart. Use this while editing code or content.
dev:           ## start with live reload (http://localhost:8080)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-logs:      ## tail logs in dev mode
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# ---------------------------------------------------------------------- data
# Content re-seeds itself from src/content/ on every boot, so it is never
# backed up. These two handle the half that cannot be regenerated: your
# progress, attempts, saved code, stories, pipeline and skill ratings.
backup:        ## dump YOUR progress to backup/progress.sql (commit it)
	@./scripts/backup-progress.sh

restore:       ## load backup/progress.sql into a running stack
	@./scripts/restore-progress.sh

psql:          ## open a psql shell
	docker compose exec db psql -U jobcracker -d jobcracker

clean:         ## nuke containers AND the database volume
	docker compose down -v
