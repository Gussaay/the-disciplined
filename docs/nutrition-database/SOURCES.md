# Sources and provenance

Checked and downloaded 16 November 2026. No food values were generated from conversation calorie estimates or inferred from food names.

## Nutrition data

**U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, SR Legacy, final April 2018 release.**

- Official download index: https://fdc.nal.usda.gov/download-datasets/
- Exact imported archive: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
- Data-type descriptions and final-release status: https://fdc.nal.usda.gov/data-documentation/
- FAQ, including SR Legacy status, energy and carbohydrate definitions: https://fdc.nal.usda.gov/faq/
- Source field definitions: https://fdc.nal.usda.gov/docs/Download_Field_Descriptions_Oct2020.pdf
- Licensing: https://fdc.nal.usda.gov/api-guide/

The downloaded archive's SHA-256 is recorded in `build_database.py`, JSON metadata and the SQLite `sources` table. Rebuild verifies it before importing. The exact CSV records, FDC food IDs, nutrient IDs, original English descriptions, source publication dates, nutrient derivations and source portion fields are retained. All values in the common-nutrient exports are copied from the normalized source rows. Nutrient units come from `nutrient.csv`.

Imported files: `food.csv`, `food_nutrient.csv`, `food_portion.csv`, `nutrient.csv`, `food_nutrient_derivation.csv`, `food_category.csv`, `measure_unit.csv`. The package preserves the nutrient derivation description and original USDA source ID; it is not a complete archive of every upstream table or every scientific citation behind the USDA release. The reproducible importer can retrieve the original archive for further analysis.

## Authored additions

Arabic names, search aliases, curated preparation labels, local coverage queue, schema, importer, tests, calculation examples and documentation were added for this package. Translations are not official USDA labels. No Arabic synonym should be read as verification of a local brand or recipe. The full original English description remains the deciding food identity.

## Coverage and freshness decision

SR Legacy was chosen as a broad, self-contained, offline baseline with complete core macros and manageable distribution size. It is **not** the newest food-composition collection. USDA states that its final release was April 2018 and it will not be updated. Do not interpret this package's assembly date as a nutrient measurement date.

A newer Foundation Foods download was investigated but not merged: the October 2026 archive returned in this check lacked the core `food.csv`, `food_nutrient.csv` and `food_portion.csv` tables required by this importer. No counts or nutrition values from that incomplete archive were used. Future data extensions must validate the actual archive contents, not just a release date on the index.

The data license is documented on the official API Guide: USDA FoodData Central data are public domain, published under CC0 1.0; permission is not needed for reuse. USDA requests source credit. This package includes that credit. This statement applies to the USDA data, not arbitrary scraped local labels, product images, trademarks or external databases.
