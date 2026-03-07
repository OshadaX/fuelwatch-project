---
description: Fuel Station Recommendation Flow (Find -> Confirm -> Feedback)
---

This workflow describes the end-to-end process of the Fuel Station Recommendation Engine.

1. **Find Near Station:** 
   - The user opens the Fuel Finder page (`FuelFinder.jsx`).
   - The user selects the fuel type, preferred brand, and optional budget. The app fetches their live location or allows manual entry.
   - Upon clicking "Find Nearest Station", the app calculates the distance to nearby stations and filters them by availability.

2. **Confirm Station:**
   - The best available station is presented to the user.
   - The user clicks **"Navigate to Station"** (or "Confirm").
   - At this moment, a log is silently automatically sent to the backend database (`recomendded stations` collection) with `logId` via a POST request to `/api/recommendations`.
   - The user is seamlessly navigated to the **Navigation Map** page (`NavigationMap.jsx`), which passes the `logId` via React Router's state.

3. **Provide Feedback:**
   - On the Navigation Map, the user follows the route using the "Live GPS Tracker".
   - Once they reach their destination, they click the **"Arrived & Feedback"** button.
   - A mandatory feedback modal appears asking for a star rating, an "Easy to find?" toggle, and optional comments.
   - Upon submission, this feedback is sent via a POST request to `/api/feedback` and saved in the `feedback` collection using the same `recommendationId`.
   - The Smart Admin Dashboard then automatically joins the `recomendded stations` and `feedback` data to display a complete view to administrators.
