import json, pickle

with open('ml/models/model_weights.json') as f:
    m = json.load(f)

with open('ml/models/model_pipeline.pkl', 'rb') as f:
    pipeline = pickle.load(f)

test_cases = [
    ('Python for Beginners Full Course Tutorial Data Structures', 1),
    ('Official Music Video Hindi Hit Song 2024 HD', 0),
    ('Introduction to Linear Algebra Vector Spaces Lecture MIT', 1),
    ('Breaking News Live Political Debate Drama Parliament', 0),
    ('CBSE Class 10 Science Chapter 1 Chemical Reactions', 1),
    ('Latest Bollywood Movie Trailer Full HD Release Date', 0),
    ('JEE Advanced 2024 Physics Mechanics Solutions', 1),
    ('IPL Cricket Match Highlights India vs Australia', 0),
    ('Machine Learning Neural Networks Deep Learning Course', 1),
    ('Viral Comedy Video Funny Moments Best Of 2024', 0),
    ('UPSC Civil Services Preparation Strategy Current Affairs', 1),
    ('Web Series Season 2 Episode 5 Full Episode HD', 0),
]

print('[')
for text, label in test_cases:
    prob = pipeline['classifier'].predict_proba(pipeline['vectorizer'].transform([text]))[0][1]
    pred = int(prob >= 0.5)
    line = '  { "text": ' + json.dumps(text) + ', "label": ' + str(label) + ', "prob": ' + str(round(prob, 8)) + ', "pred": ' + str(pred) + ' },'
    print(line)
print(']')
