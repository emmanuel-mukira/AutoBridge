CREATE FUNCTION "public"."validate_opportunity_transition"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  stages text[] := ARRAY['NEW', 'QUALIFYING', 'PROPOSAL', 'NEGOTIATION', 'CLOSED'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."stage" <> 'NEW' THEN
      RAISE EXCEPTION 'New opportunities must start at NEW';
    END IF;
  ELSIF NEW."stage" IS DISTINCT FROM OLD."stage" OR NEW."outcome" IS DISTINCT FROM OLD."outcome" THEN
    IF OLD."stage" = 'CLOSED' OR array_position(stages, NEW."stage"::text) < array_position(stages, OLD."stage"::text) THEN
      RAISE EXCEPTION 'Opportunity stage cannot move backward or reopen after closure';
    END IF;
    IF NEW."stage" = OLD."stage" THEN
      RAISE EXCEPTION 'Outcome can only be set when closing an opportunity';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "Opportunity_lifecycle" BEFORE INSERT OR UPDATE ON "public"."Opportunity"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_opportunity_transition"();
