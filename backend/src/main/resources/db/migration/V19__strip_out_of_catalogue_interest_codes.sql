-- US-019 follow-up: V5 seeded member_preference rows with interest codes the catalogue does not
-- know ("culture", "art", "shopping" against water/diving/photo/food/coffee/heritage/craft/
-- nature/adventure/slow). InterestCatalogue.labelsOf() drops unknown codes, so the page showed a
-- shorter set than the row held and the next save overwrote the missing codes for good.
--
-- Strip them once: keep the submitted order, keep the row (an empty result is the documented
-- "cleared" state, not a deleted row), and touch nothing but interest payloads -- must_do,
-- budget and submission rows do not carry a "codes" array.

UPDATE member_preference
SET payload = json_set(
        payload,
        '$.codes',
        json(COALESCE(
            (SELECT json_group_array(value)
             FROM json_each(json_extract(member_preference.payload, '$.codes'))
             WHERE value IN ('water', 'diving', 'photo', 'food', 'coffee', 'heritage', 'craft',
                             'nature', 'adventure', 'slow')),
            '[]')))
WHERE kind = 'interest'
  AND json_valid(payload)
  AND json_type(json_extract(payload, '$.codes')) = 'array';

-- The personal default interests (V9) are decoded through the same catalogue, so the same
-- out-of-catalogue codes can hide there too.
UPDATE user_default_interest
SET payload = json_set(
        payload,
        '$.codes',
        json(COALESCE(
            (SELECT json_group_array(value)
             FROM json_each(json_extract(user_default_interest.payload, '$.codes'))
             WHERE value IN ('water', 'diving', 'photo', 'food', 'coffee', 'heritage', 'craft',
                             'nature', 'adventure', 'slow')),
            '[]')))
WHERE json_valid(payload)
  AND json_type(json_extract(payload, '$.codes')) = 'array';
