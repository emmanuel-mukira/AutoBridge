# Reminder: Automotive v1 model performance page

- [ ] Revisit the Model performance tab under Decision Support for `automotive_v1`.
- [ ] Verify prediction reliability across probability bands: number scored, mean predicted probability, actual Won/Lost counts and observed win rate.
- [ ] Show the number that actually won among opportunities predicted at least 70% likely to win.
- [ ] Keep frozen model evaluation, IBM demonstration results and application outcomes clearly separated.
- [ ] For application monitoring, use the latest eligible prediction saved before the outcome; exclude predictions from other model versions and distinguish primary from limited-history results.
- [ ] Resolve packaging of `apps/crm-api/data/ibm-reliability-demo.json`: the current backend reads this file, but its directory is now ignored. A fresh checkout/deployment needs a documented generation step or an explicitly approved alternative.
- [ ] Verify empty states, mobile layouts, access permissions and calculation tests before considering the page complete.

Do not retrain, replace or overwrite frozen Automotive v1 artifacts as part of this UI work.


To be done : 
Recommended immediate change
Make the IBM demonstration data optional rather than mandatory.

If the JSON file is unavailable, the application should still return the frozen model metrics and application-outcome monitoring results. The IBM demonstration view can display an informative unavailable state.

This is more robust than making every deployment depend on an additional data-generation step.

The implementation must also preserve the existing calculation rules, model-version filtering and distinction between demonstration data and application outcomes.