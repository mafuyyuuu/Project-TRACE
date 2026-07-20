# HOW THE ALGORITHMS WORK

## Computation and Execution of the AI/ML Models in Project TRACE

This document explains, step by step, the algorithms behind each AI and machine learning model used in Project TRACE: **EasyOCR** for text recognition, **Facebook Prophet** for time-series forecasting, and **Random Forest** for prescriptive administrative insights. Each section includes the mathematical formulas, the actual implementation from the codebase, and a worked sample computation.

---

## 1. EasyOCR — Optical Character Recognition

### 1.1 Algorithm Overview

EasyOCR is a deep learning–based OCR engine built on PyTorch. It uses a two-stage pipeline to convert document images into machine-readable text:

**Stage 1 — Text Detection (CRAFT Network):**

The CRAFT (Character Region Awareness for Text Detection) model generates two heatmaps from the input image:

- **Region Score Map** — the probability that a pixel belongs to the center of a character.
- **Affinity Score Map** — the probability that a pixel lies between two adjacent characters (linking them as one word).

For each pixel at position *(x, y)*, CRAFT computes:

```
Region Score(x, y) = P(pixel is character center)
Affinity Score(x, y) = P(pixel links two characters)
```

Where each score ∈ [0, 1]. A threshold (default: 0.7 for region, 0.4 for affinity) is applied to produce bounding boxes around detected words.

**Stage 2 — Text Recognition (CRNN + CTC):**

Once word regions are detected, each cropped region is passed through a CRNN (Convolutional Recurrent Neural Network):

1. **CNN backbone** extracts visual features from the cropped image, producing a feature map of size *W × C* (width × channels).
2. **Bidirectional LSTM** processes the feature sequence to capture contextual dependencies in both directions.
3. **CTC (Connectionist Temporal Classification) Decoder** converts the output sequence into a text string.

The CTC loss function during training is defined as:

```
                   L_CTC = − ln P(l | x)
```

Where:

- *x* = the input feature sequence
- *l* = the target label sequence (ground truth text)
- *P(l | x)* = the sum of probabilities over all valid CTC alignment paths *π* that map to *l*:

```
                              ___
                P(l | x) =   \       ∏  P(π_t | x)
                              /___
                           π ∈ B⁻¹(l)   t
```

Where:

- *B⁻¹(l)* = the set of all CTC paths that collapse to label *l* after removing blanks and repeated characters
- *P(π_t | x)* = the softmax probability of character *π_t* at timestep *t*

At inference, the decoder greedily selects the most probable character at each timestep and collapses the sequence.

---

### 1.2 Image Preprocessing Pipeline (Project TRACE Implementation)

Before feeding the image to EasyOCR, Project TRACE applies an OpenCV preprocessing pipeline to enhance OCR accuracy. The implementation is found in `ocr_engine.py`:

**Step 1 — Grayscale Conversion:**

Convert the BGR image to a single-channel intensity image:

```
                Gray(x, y) = 0.299 × R + 0.587 × G + 0.114 × B
```

This follows the ITU-R BT.601 luminance formula used by `cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)`.

**Step 2 — Gaussian Blur (Noise Reduction):**

Apply a 5×5 Gaussian kernel to reduce high-frequency noise. The 2D Gaussian function is:

```
                              1              -(x² + y²)
                G(x, y) = ———————— × exp ( ——————————— )
                           2 π σ²              2 σ²
```

Where:

- *(x, y)* = pixel displacement from the kernel center
- *σ* = standard deviation (automatically derived from the kernel size 5: σ = 0.3 × ((5 − 1) × 0.5 − 1) + 0.8 = **1.1**)

The kernel is normalized so all values sum to 1. The blurred pixel value is the weighted average of its neighbors:

```
                               ___
                B(x, y) =     \     G(i, j) × I(x − i, y − j)
                               /___
                             (i,j) ∈ K
```

Where *K* is the 5×5 kernel window and *I* is the input grayscale image.

**Step 3 — Adaptive Gaussian Thresholding (Binarization):**

Each pixel is binarized based on a locally computed threshold:

```
                 ⎧ 255,    if I(x, y) > T(x, y) − C
        O(x,y) = ⎨
                 ⎩   0,    otherwise
```

Where:

- *T(x, y)* = the weighted mean of an 11×11 neighborhood around pixel *(x, y)*, computed using Gaussian weights
- *C* = 2 (a constant subtracted from the local mean to fine-tune the threshold)
- *O(x, y)* = the output binary pixel value

This adaptive approach handles documents with uneven lighting — a common issue with scanned registrar forms.

---

### 1.3 Dual-Extraction Heuristic

Project TRACE runs EasyOCR **twice** on each document — once on the preprocessed image and once on the original:

```
        extracted_text = argmax  { len(text) }
                       text ∈ {preprocessed_result, original_result}
```

The version that produces more characters is selected, under the heuristic that more extracted text implies better OCR quality.

---

### 1.4 Data Parsing and Confidence Computation

After text extraction, three regex patterns parse the raw text into structured fields:

| Field | Regex Pattern | Example Match |
|-------|--------------|---------------|
| Student ID | `(?:student\s*(?:no\|number\|id)[.:\s]*)?\b(\d{2}[-‐]\d{4,6})\b` | `23-00939` |
| Last Name | `(?:student\s*)?name[:\s]+([A-Z][A-Za-z]+)` | `DELA CRUZ` |
| Form Type | Keyword matching: `transcript`, `tor`, `clearance`, `diploma`, `good moral`, `honorable dismissal` | `Transcript of Records` |

The extraction **Confidence Score** is computed as:

```
                        Fields Found
        Confidence = ——————————————— × 100
                       Total Fields

                        Fields Found
                   = ——————————————— × 100
                             3
```

Where:

- Fields Found = the count of successfully extracted fields (student_id, last_name, form_type)
- Total Fields = 3 (the fixed number of target fields)

---

### 1.5 Sample Computation — Document OCR Extraction

Given a scanned **Transcript of Records** image uploaded to the Window 1 Clerk desk, the following computation occurs:

**Input:** A JPEG image file of a PLP Transcript of Records for student Juan Dela Cruz (ID: 23-00939).

**Step 1 — Preprocessing:**

The image is converted to grayscale, blurred with a 5×5 Gaussian kernel (σ = 1.1), and binarized with adaptive Gaussian thresholding (block size = 11, C = 2).

**Step 2 — Dual OCR Extraction:**

| Attempt | Text Length | Selected? |
|---------|------------|-----------|
| Preprocessed image | 847 characters | ✅ Yes (longer) |
| Original image | 612 characters | ❌ No |

**Step 3 — Raw Extracted Text (partial):**

```
PAMANTASAN NG LUNGSOD NG PASIG
TRANSCRIPT OF RECORDS
Student No: 23-00939
Student Name: DELA CRUZ, Juan Miguel
College: College of Computer Studies
```

**Step 4 — Regex Parsing:**

1. Student ID regex matches `23-00939` → **student_id = "23-00939"** ✅
2. Name regex matches `DELA CRUZ` → **last_name = "DELA CRUZ"** ✅
3. Keyword `transcript` found → **form_type = "Transcript of Records"** ✅

**Step 5 — Confidence Calculation:**

```
                    3
        Confidence = — × 100 = 100.00%
                    3
```

| student_id | last_name | form_type | confidence |
|-----------|-----------|-----------|------------|
| 23-00939 | DELA CRUZ | Transcript of Records | **100.00%** |

Since confidence > 0%, the result is flagged as `success: true` and the `ocr_confidence_score` of **100.00** is stored in the `documents` table for the Secretary to review in the Split-Screen OCR Evaluation Modal.

---

### 1.6 Sample Computation — 3-Point Registration Verification

When a student registers and uploads their PLP ID, the AI verifies three data points simultaneously.

**Input:** Uploaded PLP Student ID image, expected `student_id = "24-00512"`, expected `course = "College of Computer Studies"`.

**Step 1 — OCR Extraction:**

Raw text extracted (lowercased for comparison):

```
"pamantasan ng lungsod ng pasig ... student id: 24-00512 ... college of computer studies ..."
```

**Step 2 — Three-Point Verification:**

| Check | Search Term | Found in Text? | Result |
|-------|------------|----------------|--------|
| ① School Name | `"pamantasan ng lungsod ng pasig"` OR `"plp"` | ✅ Yes | `has_school_name = True` |
| ② Student ID | `"24-00512"` | ✅ Yes | `has_student_id = True` |
| ③ Course | `"college of computer studies"` | ✅ Yes | `has_course = True` |

**Step 3 — Verification Decision:**

```
        if has_school_name AND has_student_id AND has_course:
            → verified = True
            → Account status set to 'active' (auto-verified)
```

**Result:** `{ verified: true, reason: "School name, Student ID, and College matched." }`

If any one point fails (e.g., the uploaded image is from a different school), the account status remains `'pending'` and requires manual Admin verification.

---

## 2. Facebook Prophet — 7-Day Volume Forecasting

### 2.1 Algorithm Overview

Facebook Prophet is a time-series forecasting model developed by Meta's Core Data Science team (Taylor & Letham, 2018). It uses a decomposable additive model to represent the components of a time series:

```
                y(t) = g(t) + s(t) + h(t) + ε(t)
```

Where:

- **y(t)** = the forecast value (predicted number of document transactions) at time *t*
- **g(t)** = the trend component (long-term growth or decline)
- **s(t)** = the seasonality component (repeating weekly/daily patterns)
- **h(t)** = the holiday/event component (irregular occurrences; not used in TRACE)
- **ε(t)** = the error term (irreducible noise assumed to be normally distributed)

---

### 2.2 Trend Component — g(t)

Project TRACE uses Prophet's default **piecewise linear trend** model:

```
                g(t) = (k + a(t)ᵀ δ) × t + (m + a(t)ᵀ γ)
```

Where:

- *k* = the base growth rate (slope of the trend line)
- *δ* = a vector of rate adjustments at changepoints (where the slope changes)
- *m* = the offset (intercept)
- *γ* = adjustments to the offset to keep the function continuous at changepoints
- *a(t)* = a binary indicator vector: a(t)_j = 1 if *t ≥ s_j* (where *s_j* is the j-th changepoint)

Prophet automatically selects up to 25 potential changepoints in the first 80% of the data.

---

### 2.3 Seasonality Component — s(t)

In Project TRACE, **daily seasonality** is enabled (`daily_seasonality=True`), and yearly seasonality is disabled. Prophet represents seasonality using a **Fourier series** — a sum of sinusoidal terms:

```
                     N
                    ___
        s(t) =     \    [ aₙ × cos(2πnt / P) + bₙ × sin(2πnt / P) ]
                    /___
                    n=1
```

Where:

- *P* = the period length (for daily seasonality, *P* = 1 day)
- *N* = the number of Fourier terms (default: *N* = 4 for daily seasonality)
- *aₙ, bₙ* = the Fourier coefficients fitted during training, which determine the shape and amplitude of the seasonal pattern

For daily seasonality with *N* = 4, the model learns **8 parameters** (4 cosine + 4 sine coefficients) that capture intra-day patterns such as higher document volumes during morning office hours.

---

### 2.4 Model Fitting — MAP Estimation

Prophet fits the model using **Maximum a Posteriori (MAP) estimation** via the Stan probabilistic programming framework:

```
        θ* = argmax  { ln P(y | θ) + ln P(θ) }
              θ
```

Where:

- *θ* = the set of all model parameters (k, δ, m, γ, aₙ, bₙ, σ)
- *P(y | θ)* = the likelihood of the observed data given the parameters (Gaussian likelihood)
- *P(θ)* = the prior distribution over parameters (Laplace prior on δ to regularize changepoints)

The Laplace (double-exponential) prior on the rate changes *δ* is:

```
                              1           |δ_j|
        P(δ_j | τ) = ————————— × exp( − ————— )
                        2τ                  τ
```

Where *τ* controls the flexibility of the trend. A smaller *τ* penalizes large rate changes, producing a smoother trend.

---

### 2.5 Project TRACE Implementation

The forecast endpoint in `app.py` executes as follows:

```python
# 1. Query historical daily volumes from the step_logs table
query = "SELECT DATE(timestamp_started) as ds, COUNT(*) as y 
         FROM step_logs GROUP BY DATE(timestamp_started)"
df = pd.read_sql(query, conn)

# 2. Initialize Prophet with daily seasonality
m = Prophet(daily_seasonality=True, yearly_seasonality=False)

# 3. Fit the model on historical data
m.fit(df)

# 4. Generate a 7-day future dataframe
future = m.make_future_dataframe(periods=7)

# 5. Predict
forecast_df = m.predict(future)

# 6. Extract the last 7 rows (the forecast period)
next_7_days = forecast_df.tail(7)
```

The predicted value `yhat` for each future day is:

```
        ŷ(t) = g(t) + s(t) + h(t)
```

Prophet also outputs `yhat_lower` and `yhat_upper` (the 80% uncertainty interval), though TRACE currently uses only `yhat`.

---

### 2.6 Sample Computation — 7-Day Forecast

**Input Data:** The `step_logs` table contains historical transaction records. After grouping by date:

| Date (ds) | Transaction Count (y) |
|-----------|-----------------------|
| 2026-07-10 | 12 |
| 2026-07-11 | 18 |
| 2026-07-12 | 7 |
| 2026-07-13 | 3 |
| 2026-07-14 | 22 |
| 2026-07-15 | 25 |
| 2026-07-16 | 19 |
| 2026-07-17 | 14 |
| 2026-07-18 | 20 |
| 2026-07-19 | 16 |

**Step 1 — Data Validation:**

`len(df) = 10`, which is ≥ 2 (the minimum required). Proceed.

**Step 2 — Model Fitting:**

Prophet fits the additive model *y(t) = g(t) + s(t) + ε(t)* on the 10 data points using MAP estimation. The fitted trend captures the base rate (approximately 15.6 transactions/day), and the daily seasonality captures the weekly cycle (lower volumes on weekends, peak on weekdays).

**Step 3 — Future Dataframe Generation:**

Prophet creates entries for 7 future dates: 2026-07-20 through 2026-07-26.

**Step 4 — Prediction:**

For each future date, the model computes ŷ(t) = g(t) + s(t):

| Date | Day | g(t) (Trend) | s(t) (Seasonality) | ŷ(t) = g(t) + s(t) | Output (floored at 0) |
|------|-----|-------------|--------------------|--------------------|----------------------|
| 2026-07-20 | Sun | 15.7 | −7.2 | 8.5 | **8** |
| 2026-07-21 | Mon | 15.8 | +5.3 | 21.1 | **21** |
| 2026-07-22 | Tue | 15.9 | +4.8 | 20.7 | **20** |
| 2026-07-23 | Wed | 16.0 | +2.1 | 18.1 | **18** |
| 2026-07-24 | Thu | 16.1 | +1.5 | 17.6 | **17** |
| 2026-07-25 | Fri | 16.2 | +0.9 | 17.1 | **17** |
| 2026-07-26 | Sat | 16.3 | −5.8 | 10.5 | **10** |

**Step 5 — Output:**

The forecast is returned as JSON and rendered on the Admin Dashboard as an area chart:

```json
{
  "forecast": [
    { "date": "2026-07-20", "day": "Sun", "predicted_volume": 8 },
    { "date": "2026-07-21", "day": "Mon", "predicted_volume": 21 },
    { "date": "2026-07-22", "day": "Tue", "predicted_volume": 20 },
    { "date": "2026-07-23", "day": "Wed", "predicted_volume": 18 },
    { "date": "2026-07-24", "day": "Thu", "predicted_volume": 17 },
    { "date": "2026-07-25", "day": "Fri", "predicted_volume": 17 },
    { "date": "2026-07-26", "day": "Sat", "predicted_volume": 10 }
  ],
  "source": "prophet"
}
```

The Registrar Admin can use this forecast to anticipate that Monday (21 predicted transactions) will be the busiest day and allocate additional staff accordingly, while Saturday and Sunday will see reduced traffic.

---

## 3. Random Forest Classifier — Prescriptive Administrative Insights

### 3.1 Algorithm Overview

A Random Forest is an **ensemble learning** method that constructs multiple decision trees during training and outputs the class that is the **mode** (majority vote) of the individual trees' predictions (Breiman, 2001):

```
                ŷ = Mode { h₁(x), h₂(x), ..., hₙ(x) }
```

Where:

- *ŷ* = the predicted class label
- *hᵢ(x)* = the prediction of the i-th decision tree for input feature vector *x*
- *n* = the number of trees in the forest (in TRACE: **n = 10 estimators**)

Each tree is trained on a **bootstrap sample** (random subset with replacement) of the training data, and at each split, only a random subset of features is considered. This dual randomness reduces overfitting and variance.

---

### 3.2 Decision Tree Splitting Criterion — Gini Impurity

Each individual decision tree uses the **Gini Impurity** metric to decide where to split:

```
                         C
                        ___
        Gini(t) = 1 −   \    p(i|t)²
                        /___
                        i=1
```

Where:

- *t* = the node being evaluated for splitting
- *C* = the number of classes (in TRACE: C = 4)
- *p(i|t)* = the proportion of samples belonging to class *i* at node *t*

The optimal split is the one that maximizes the **information gain** (reduction in impurity):

```
                                    |t_L|                |t_R|
        ΔGini = Gini(t) − ( ———————— × Gini(t_L) + ———————— × Gini(t_R) )
                                  |t|                  |t|
```

Where:

- *t_L, t_R* = the left and right child nodes after the split
- *|t|, |t_L|, |t_R|* = the number of samples in each node

The feature and threshold that maximize *ΔGini* are chosen for each split.

---

### 3.3 Feature Engineering — Input Vector

Project TRACE constructs a **3-dimensional feature vector** from real-time database metrics:

```
        x = [ pending_secretary,  pending_release,  today_volume ]
```

Where:

- **pending_secretary** = COUNT of documents with `current_status = 'pending_secretary'`
- **pending_release** = COUNT of documents with `current_status = 'ready_window_1'`
- **today_volume** = COUNT of `step_logs` entries where `DATE(timestamp_started) = CURDATE()`

These three SQL queries are executed in real time against the MySQL database when the `/ai/recommend` endpoint is called.

---

### 3.4 Training Data and Classification Labels

The classifier is trained on a **heuristic-defined** training set representing four operational states:

| Training Sample | pending_secretary | pending_release | today_volume | Label | Interpretation |
|:-:|:-:|:-:|:-:|:-:|:--|
| 1 | 1 | 0 | 5 | **0** | Low load — System is running smoothly |
| 2 | 10 | 2 | 25 | **1** | Secretary bottleneck — Evaluation queue is congested |
| 3 | 2 | 10 | 15 | **2** | Release buildup — Window 1 is overloaded with unreleased docs |
| 4 | 15 | 10 | 50 | **3** | Overloaded — System-wide critical capacity |

The Random Forest with `n_estimators=10` and `random_state=42` fits 10 decision trees on bootstrap samples of this training data.

---

### 3.5 Prediction and Insight Generation

After classification, the prediction label is mapped to actionable insights with a **dual-condition** approach — both the Random Forest label AND direct threshold checks are evaluated:

```
        if prediction == 1  OR  pending_secretary > 5:
            → "Secretary Bottleneck Detected"

        if prediction == 2  OR  pending_release > 3:
            → "Release Queue Buildup"

        if prediction == 3:
            → "System Overloaded"

        if no insights generated:
            → "Optimal Performance"
```

This hybrid approach ensures that even if the classifier produces a false negative (e.g., predicts class 0), the direct threshold checks still trigger warnings when queues are objectively high.

---

### 3.6 Sample Computation — Prescriptive Insight Generation

**Scenario:** The Registrar Admin opens the Admin Dashboard at 2:30 PM on a Monday. The system queries the database in real time.

**Step 1 — Feature Vector Construction (SQL Queries):**

```sql
SELECT COUNT(*) FROM documents WHERE current_status = 'pending_secretary';
-- Result: pending_secretary = 8

SELECT COUNT(*) FROM documents WHERE current_status = 'ready_window_1';
-- Result: pending_release = 2

SELECT COUNT(*) FROM step_logs WHERE DATE(timestamp_started) = CURDATE();
-- Result: today_volume = 19
```

Feature vector: **x = [8, 2, 19]**

**Step 2 — Random Forest Classification:**

Each of the 10 decision trees casts a vote based on x = [8, 2, 19]:

| Tree # | Bootstrap Features Used | Split Conditions | Vote |
|:------:|:-:|:--|:-:|
| 1 | pending_sec, today_vol | pending_sec > 5.5 → Class 1 | **1** |
| 2 | pending_sec, pending_rel | pending_sec > 5.5 → Class 1 | **1** |
| 3 | today_vol, pending_sec | today_vol < 20 AND pending_sec > 5.5 → Class 1 | **1** |
| 4 | pending_sec, pending_rel | pending_sec > 5.5 → Class 1 | **1** |
| 5 | pending_rel, today_vol | pending_rel < 6 AND today_vol < 20 → Class 0 | **0** |
| 6 | pending_sec, today_vol | pending_sec > 5.5 → Class 1 | **1** |
| 7 | pending_sec, pending_rel | pending_sec > 5.5 → Class 1 | **1** |
| 8 | today_vol, pending_sec | pending_sec > 5.5 → Class 1 | **1** |
| 9 | pending_rel, pending_sec | pending_sec > 5.5 → Class 1 | **1** |
| 10 | pending_sec, today_vol | pending_sec > 5.5 → Class 1 | **1** |

**Step 3 — Majority Vote:**

```
        Votes:  Class 0 = 1,  Class 1 = 9,  Class 2 = 0,  Class 3 = 0

        ŷ = Mode { 1, 1, 1, 1, 0, 1, 1, 1, 1, 1 } = 1 (Secretary Bottleneck)
```

**Step 4 — Dual-Condition Insight Generation:**

```
        prediction == 1?  → YES  ✅
        pending_secretary (8) > 5?  → YES  ✅
        → Generate: "Secretary Bottleneck Detected"

        prediction == 2?  → NO
        pending_release (2) > 3?  → NO
        → No release insight

        prediction == 3?  → NO
        → No overload insight
```

**Step 5 — Output:**

```json
{
  "insights": [
    {
      "type": "warning",
      "title": "AI Insight: Secretary Bottleneck Detected",
      "message": "Random Forest classifier detected high evaluation queue 
                  (8 docs). Consider assigning extra staff."
    }
  ],
  "source": "random_forest"
}
```

The Admin Dashboard renders this as an amber alert card, informing the Registrar Admin that 8 documents are queued for secretary evaluation and recommending additional staff deployment.

If the feature vector had been **x = [1, 0, 3]** instead, the Random Forest would classify it as **Class 0** and neither threshold condition would be met, resulting in the "Optimal Performance" green info card.

---

## Summary of Algorithms

| Model | Algorithm | Input | Output | Key Formula |
|-------|-----------|-------|--------|-------------|
| **EasyOCR** | CRAFT + CRNN + CTC | Document image | Extracted text + structured data | Confidence = (Fields Found / 3) × 100 |
| **Prophet** | Additive decomposition + MAP estimation | Historical step_logs (date, count) | 7-day predicted volumes | y(t) = g(t) + s(t) + ε(t) |
| **Random Forest** | Ensemble of 10 decision trees + majority vote | [pending_sec, pending_rel, today_vol] | Class label (0–3) → admin insight | ŷ = Mode{h₁(x), ..., h₁₀(x)}, Split by Gini Impurity |

---

### References

- Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5–32.
- Taylor, S. J., & Letham, B. (2018). Forecasting at Scale. *The American Statistician*, 72(1), 37–45.
- Baek, Y., Lee, B., Han, D., Yun, S., & Lee, H. (2019). Character Region Awareness for Text Detection. *IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)*, 9365–9374.
- Shi, B., Bai, X., & Yao, C. (2017). An End-to-End Trainable Neural Network for Image-Based Sequence Recognition and Its Application to Scene Text Recognition. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 39(11), 2298–2304.
- Graves, A., Fernández, S., Gomez, F., & Schmidhuber, J. (2006). Connectionist Temporal Classification: Labelling Unsegmented Sequence Data with Recurrent Neural Networks. *Proceedings of the 23rd International Conference on Machine Learning*, 369–376.
