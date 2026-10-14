# Driver Expenses Tracker

Static mobile-first webpage for tracking rideshare and Amazon Flex driving income across any year.

## What it tracks

- Daily trip data with total kilometres driven
- Uber fares and Amazon Flex fares
- Uber, Lyft, and Amazon Flex fares
- Fuel, maintenance, and other daily costs
- Monthly fixed costs
- Weekly summaries where each week runs Monday to Sunday
- Whole-month summaries for the selected year
- Saved day history with backup export/import

## Files

- `index.html` - app layout
- `styles.css` - screenshot-inspired mobile styling
- `app.js` - local storage, calculations, reporting, backup logic
- `m2026.xlsx` - old workbook file kept in the folder for reference

## How to use

Open `index.html` in a browser, or serve the folder with a static web server. The app saves data in the same browser with `localStorage`, so export a JSON backup regularly from the Saved page.
