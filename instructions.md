# Instructions for the Islamic Identity & Values Web Application

## Objective
Create a standalone web analysis tool where users receive a hexagon radar chart visualizing their alignment across 6 dimensions based on a survey of 30 questions (5 per dimension).

## Technical Architecture
- **Frontend:** Single HTML page (index.html) containing CSS and JavaScript.
- **Charts:** Use Chart.js to render the radar chart.
- **Data Input:** The application should read score data via URL parameters (e.g., ?identity=3&compliance=1&political=-2&...).
- **Scale Mapping:**
  - ++ = 2, + = 1, = = 0, - = -1, -- = -2
- **Matching Logic:** Compare user's 6D coordinates against pre-defined "Archetype Vectors" using Euclidean distance. Display the closest match.
- **Data Export:** Include a fetch call to a Google Apps Script Webhook URL to send user scores (JSON format) for research analysis.

## User Workflow
1. User completes a Google Form with 30 questions.
2. Form redirects user to index.html with calculated dimension sums as URL parameters.
3. index.html renders the hexagon, displays the archetype, and logs data to the research endpoint.
