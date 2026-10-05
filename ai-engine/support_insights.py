"""Transparent support advice from aggregates; no conversations or training."""
import math

TOPICS = {"profile", "email", "requests", "payment", "copies", "walk-in", "general", "linked"}


def build_support_insights(data):
    allowed = {"period", "created", "categories", "queue", "escalation", "faq", "busy_periods", "previous"}
    if not isinstance(data, dict) or set(data) - allowed:
        raise ValueError("Only approved aggregate fields are accepted.")
    period = data.get("period", {})
    if not isinstance(period, dict) or set(period) - {"from", "to_exclusive", "timezone"}:
        raise ValueError("A reporting period is required.")

    def number(value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError("Invalid aggregate count or duration.")
        return value

    def fields(value, allowed_fields):
        if not isinstance(value, dict) or set(value) - allowed_fields:
            raise ValueError("Only approved aggregate fields are accepted.")
        return value

    categories = fields(data.get("categories", {}), TOPICS)
    for value in categories.values():
        number(value)
    queue = fields(data.get("queue", {}), {"samples", "missing", "median_minutes", "p90_minutes"})
    for key, value in queue.items():
        if value is not None or key in {"samples", "missing"}:
            number(value)
    escalation = fields(data.get("escalation", {}), {"numerator", "denominator", "percent"})
    for key, value in escalation.items():
        if value is not None or key != "percent":
            number(value)
    faq = fields(data.get("faq", {}), {"views", "topics"})
    number(faq.get("views", 0))
    for value in fields(faq.get("topics", {}), TOPICS).values():
        number(value)
    previous = fields(data.get("previous", {}), {"period", "escalation", "queue_samples", "queue_median_minutes"})
    if "period" in previous:
        fields(previous["period"], {"from", "to_exclusive", "timezone"})
    if "escalation" in previous:
        for key, value in fields(previous["escalation"], {"numerator", "denominator", "percent"}).items():
            if value is not None or key != "percent":
                number(value)
    for key in ("queue_samples", "queue_median_minutes"):
        if previous.get(key) is not None:
            number(previous[key])
    busy = fields(data.get("busy_periods", {}), {f"{day}:{hour}" for day in range(7) for hour in range(24)})
    for value in busy.values():
        number(value)

    count = number(data.get("created", 0))
    insights = []

    def add(title, message, metric, samples, tone="info"):
        insights.append({"type": tone, "title": title, "message": message, "period": period,
                         "sample_size": samples, "evidence": metric, "method": "aggregate_rules",
                         "recommendation": True})

    if count < 10:
        add("Support: insufficient new-ticket history", f"{count:g} new tickets in this period. Collect more observations before interpreting support trends.", {"new_tickets": count}, count)
        return insights
    faq = data.get("faq", {})
    views = number(faq.get("views", 0))
    topics = faq.get("topics", {})
    if not isinstance(topics, dict) or set(topics) - TOPICS:
        raise ValueError("Only approved FAQ categories are accepted.")
    if views >= 10 and topics:
        top = max(topics, key=lambda key: number(topics[key]))
        top_views = number(topics[top])
        add("Support: recurring FAQ topic", f"{top} accounts for {top_views:g} of {views:g} FAQ views. Consider reviewing its approved guidance; views alone do not show resolution.", {"category": top, "views": top_views, "total_views": views}, views)
    queue = data.get("queue", {})
    samples = number(queue.get("samples", 0))
    median = queue.get("median_minutes")
    previous = data.get("previous", {})
    previous_samples = number(previous.get("queue_samples", 0))
    previous_median = previous.get("queue_median_minutes")
    if samples >= 10 and median is not None and previous_samples >= 10 and previous_median is not None:
        median, previous_median = number(median), number(previous_median)
        if median > max(5, previous_median * 1.5):
            add("Support: queue wait increased", f"Median initial queue wait is {median:g} service minutes versus {previous_median:g} in the preceding equal-length period. Review availability; this is descriptive, not a forecast.", {"median_minutes": median, "previous_median_minutes": previous_median, "previous_samples": previous_samples, "previous_period": previous.get("period", {})}, samples, "warning")
    escalation = data.get("escalation", {})
    denominator, numerator = number(escalation.get("denominator", 0)), number(escalation.get("numerator", 0))
    if numerator > denominator:
        raise ValueError("Invalid escalation denominator.")
    if denominator >= 10:
        add("Support: escalation review", f"{numerator:g} of {denominator:g} FAQ-assisted new tickets escalated ({100*numerator/denominator:.1f}%). Review approved answers and staffing alongside explicit feedback; escalation does not prove FAQ failure.", {"escalated": numerator, "eligible": denominator}, denominator)
    prior_escalation = previous.get("escalation", {})
    prior_denominator = number(prior_escalation.get("denominator", 0))
    prior_numerator = number(prior_escalation.get("numerator", 0))
    if prior_numerator > prior_denominator:
        raise ValueError("Invalid preceding escalation denominator.")
    if denominator >= 10 and prior_denominator >= 10:
        delta = 100 * numerator / denominator - 100 * prior_numerator / prior_denominator
        if abs(delta) >= 15:
            add("Support: escalation rate changed", f"Escalation changed by {delta:+.1f} percentage points from the preceding equal-length period. Review FAQ feedback and staffing; this threshold is descriptive and is not a significance test.",
                {"percentage_point_change": delta, "eligible": denominator, "previous_eligible": prior_denominator, "previous_period": previous.get("period", {})}, denominator, "warning" if delta > 0 else "info")
    busy = data.get("busy_periods", {})
    if busy and isinstance(busy, dict):
        key = max(busy, key=lambda slot: number(busy[slot]))
        day, hour = key.split(":")
        if not day.isdigit() or not hour.isdigit() or not 0 <= int(day) <= 6 or not 0 <= int(hour) <= 23:
            raise ValueError("Invalid Manila time bucket.")
        observations = number(busy[key])
        if observations >= 5:
            day_name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][int(day)]
            add("Support: busiest queue-entry period", f"{day_name} at {int(hour):02d}:00 Manila recorded {observations:g} queue entries. Review staffing; requeues are included and this is not predicted demand.", {"weekday": int(day), "hour": int(hour), "queue_entries": observations}, observations)
    if not insights:
        add("Support: no supported trend yet", "Ticket volume is available, but measured duration, FAQ or time-bucket samples do not support a trend recommendation yet.", {"new_tickets": count}, count)
    return insights
