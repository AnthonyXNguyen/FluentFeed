from app.speech import parse_word_scores


def test_omitted_word_without_accuracy_score() -> None:
    # Real Azure shape when the user says the wrong word (miscue enabled):
    # the reference word is an Omission and has no AccuracyScore.
    detail = {"NBest": [{"Words": [
        {"Word": "hello", "PronunciationAssessment": {"ErrorType": "Omission"}},
    ]}]}
    [word] = parse_word_scores(detail)
    assert word.word == "hello"
    assert word.accuracy_score == 0
    assert word.error_type == "Omission"


def test_scored_word() -> None:
    detail = {"NBest": [{"Words": [
        {"Word": "hola", "PronunciationAssessment": {"AccuracyScore": 98.5, "ErrorType": "None"}},
    ]}]}
    [word] = parse_word_scores(detail)
    assert word.accuracy_score == 98.5


def test_no_words() -> None:
    assert parse_word_scores({"NBest": [{}]}) == []
