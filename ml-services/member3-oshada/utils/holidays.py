# utils/holidays.py
"""
Sri Lankan public holidays utility module.
Includes Poya days, national holidays, and vacation period detection.
"""

from datetime import date, datetime
from typing import Union

# Sri Lankan Public Holidays (Fixed dates)
# Note: Poya days vary each year based on lunar calendar - using 2024-2026 approximations
FIXED_HOLIDAYS = {
    # New Year's Day
    (1, 1): "New Year's Day",
    # Tamil Thai Pongal
    (1, 14): "Tamil Thai Pongal",
    # National Day
    (2, 4): "National Day",
    # Sinhala & Tamil New Year
    (4, 13): "Sinhala & Tamil New Year Eve",
    (4, 14): "Sinhala & Tamil New Year",
    # May Day
    (5, 1): "May Day",
    # Christmas
    (12, 25): "Christmas Day",
    (12, 26): "Boxing Day",
}

# Approximate Poya Days for 2024, 2025, 2026
# These are based on lunar calendar and may vary slightly
POYA_DAYS = {
    2024: [
        (1, 25), (2, 23), (3, 24), (4, 23), (5, 23), (6, 21),
        (7, 20), (8, 19), (9, 17), (10, 17), (11, 15), (12, 14)
    ],
    2025: [
        (1, 13), (2, 12), (3, 13), (4, 12), (5, 12), (6, 10),
        (7, 10), (8, 8), (9, 7), (10, 6), (11, 5), (12, 4)
    ],
    2026: [
        (1, 3), (2, 1), (3, 3), (4, 1), (5, 1), (5, 31),
        (6, 29), (7, 29), (8, 27), (9, 26), (10, 25), (11, 24), (12, 23)
    ]
}

# Vesak and Poson are special Poya days (usually observed for 2 days)
SPECIAL_POYA_MONTHS = {5: "Vesak", 6: "Poson"}


def is_sri_lankan_holiday(check_date: Union[date, datetime, str]) -> bool:
    """
    Check if a given date is a Sri Lankan public holiday.
    
    Args:
        check_date: Date to check (date object, datetime, or string 'YYYY-MM-DD')
    
    Returns:
        True if the date is a holiday, False otherwise
    """
    if isinstance(check_date, str):
        check_date = datetime.strptime(check_date, "%Y-%m-%d").date()
    elif isinstance(check_date, datetime):
        check_date = check_date.date()
    
    month, day = check_date.month, check_date.day
    year = check_date.year
    
    # Check fixed holidays
    if (month, day) in FIXED_HOLIDAYS:
        return True
    
    # Check Poya days
    if year in POYA_DAYS:
        for poya_month, poya_day in POYA_DAYS[year]:
            if month == poya_month and day == poya_day:
                return True
            # Day after Vesak and Poson is also a holiday
            if poya_month in SPECIAL_POYA_MONTHS:
                if month == poya_month and day == poya_day + 1:
                    return True
    
    return False


def is_vacation_period(check_date: Union[date, datetime, str]) -> bool:
    """
    Check if a date falls within a typical Sri Lankan vacation/school holiday period.
    
    Vacation periods:
    - April: Sinhala/Tamil New Year season (April 10-20)
    - August: School vacation (mid-August)
    - December: Christmas vacation (Dec 20 - Jan 5)
    
    Args:
        check_date: Date to check
    
    Returns:
        True if in vacation period
    """
    if isinstance(check_date, str):
        check_date = datetime.strptime(check_date, "%Y-%m-%d").date()
    elif isinstance(check_date, datetime):
        check_date = check_date.date()
    
    month, day = check_date.month, check_date.day
    
    # April New Year season
    if month == 4 and 10 <= day <= 20:
        return True
    
    # August vacation
    if month == 8 and 10 <= day <= 25:
        return True
    
    # December-January vacation
    if (month == 12 and day >= 20) or (month == 1 and day <= 5):
        return True
    
    return False


def get_holiday_name(check_date: Union[date, datetime, str]) -> str:
    """
    Get the name of the holiday for a given date.
    
    Returns:
        Holiday name or empty string if not a holiday
    """
    if isinstance(check_date, str):
        check_date = datetime.strptime(check_date, "%Y-%m-%d").date()
    elif isinstance(check_date, datetime):
        check_date = check_date.date()
    
    month, day = check_date.month, check_date.day
    year = check_date.year
    
    # Check fixed holidays
    if (month, day) in FIXED_HOLIDAYS:
        return FIXED_HOLIDAYS[(month, day)]
    
    # Check Poya days
    if year in POYA_DAYS:
        for poya_month, poya_day in POYA_DAYS[year]:
            if month == poya_month and day == poya_day:
                poya_name = SPECIAL_POYA_MONTHS.get(poya_month, "Full Moon")
                return f"{poya_name} Poya"
    
    return ""


if __name__ == "__main__":
    # Test the module
    test_dates = [
        "2026-01-01",  # New Year
        "2026-02-01",  # Poya day
        "2026-04-14",  # Sinhala New Year
        "2026-05-01",  # May Day / Vesak Poya
        "2026-12-25",  # Christmas
        "2026-08-15",  # Vacation period
    ]
    
    print("Testing Sri Lankan Holidays Module:")
    print("-" * 50)
    for d in test_dates:
        is_hol = is_sri_lankan_holiday(d)
        is_vac = is_vacation_period(d)
        name = get_holiday_name(d)
        print(f"{d}: Holiday={is_hol}, Vacation={is_vac}, Name='{name}'")
