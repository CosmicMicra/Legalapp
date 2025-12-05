from flask import Flask, jsonify, send_from_directory, request, session
import pandas as pd
import os
import json
import google_storage_utility
from google_storage_utility import download_cs_file, upload_cs_file, list_cs_files, delete_cs_file
from werkzeug.security import generate_password_hash, check_password_hash
import openai
from config import Config

# store last compiled summary for use in chat
LAST_SUMMARY = None


app = Flask(__name__)
app.config.from_pyfile('config.cfg')
app.secret_key = os.environ.get("SECRET_KEY", "randomstring")

OPENAI_API_KEY = app.config['OPENAI_API_KEY']
os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY
client = openai.OpenAI(api_key=OPENAI_API_KEY)


# Google Cloud Storage configuration
BUCKET_NAME = "michele_test_bucket_unique"
GCS_PREFIX = "wihi"

USERS_FILE = "users.json"
#DEFAULT_USERS = {"admin": "20legal25", "michele": "20legal25", "lauren": "20legal25"}

def load_users():
    try:
        download_cs_file(BUCKET_NAME, f"{GCS_PREFIX}/users.json", USERS_FILE)
    except Exception:
        pass
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE) as f:
            return json.load(f)
    # users = {u: generate_password_hash(p) for u, p in DEFAULT_USERS.items()}
    # with open(USERS_FILE, "w") as f:
    #     json.dump(users, f)
    # return users

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)
    try:
        upload_cs_file(BUCKET_NAME, USERS_FILE, f"{GCS_PREFIX}/users.json")
    except Exception:
        pass

USERS = load_users()

EXCEL_FILE = "questions.xlsx"
USER_DATA_DIR = "user_data"

def load_questionnaire():
    if not os.path.exists(EXCEL_FILE):
        return {"error": "questions.xlsx not found"}, 404

    sections_df = pd.read_excel(EXCEL_FILE, sheet_name="Sections")
    questions_df = pd.read_excel(EXCEL_FILE, sheet_name="Questions")

    # find nested level of conditional questions
    # cond_questions = questions_df.loc[~questions_df["Conditional on question"].isna()]
    # for _, row in cond_questions.iterrows():
    #     this_id = row["Id"]
    #     parent = row["Conditional on question"]
    #     parent_id = parent.split(',')[0]
    #     parent_row = questions_df[questions_df.Id == parent_id].values[0]
    #     level = 1
    #     while(parent_row is not None):
    #         this_id = parent_row.Id
    #         this_id = parent.split(',')[0]
    #         parent = row["Conditional on question"]

        


    sections = []
    for _, section in sections_df.iterrows():
        sec_num = section["Section number"]
        section_questions = questions_df[questions_df["Section"] == sec_num].sort_values(by="Question number")

        questions = []
        for _, q in section_questions.iterrows():
            q = {
                "id": q["Id"],
                "label": q["Label"],
                "type": q["Type"].lower().strip(),
                "parameters": eval(q["Parameters"]) if pd.notna(q["Parameters"]) else None,
                "conditional_on": str(q["Conditional on question"]) if pd.notna(q["Conditional on question"]) else None,
                "mandatory": str(q["Mandatory"]).strip().lower() == "yes",
                "slider": str(q["Needs a slider"]).strip().lower() == "yes",
                "default_slider_value": float(q["Default value of slider"]) if pd.notna(q["Default value of slider"]) else None,
                "level" : 1
            }

            questions.append(q)

        sections.append({
            "section_number": sec_num,
            "title": section["Title"],
            "questions": questions
        })

    return {"sections": sections}


def compile_summary(answers, username=None):
    html_parts = []
    if username:
        profile_path = os.path.join(USER_DATA_DIR, username, "profile.txt")
        profile_text = ""
        if os.path.exists(profile_path):
            with open(profile_path) as pf:
                profile_text = pf.read().strip()
        if profile_text:
            html_parts.append(f"<h2>Profile</h2><p>{profile_text}</p>")

    html_parts.append("<ul>")
    html_parts.append("<li>I need to evaluate a discrimination case. Together with the client, the lawyer filled out a questionnarie that describes the case</li>")
    html_parts.append("<li>We are in the state of New York</li>")
    html_parts.append("<li>The table below reports the answers to the questionnaire. The columns are as follows:</li>")
    html_parts.append("<ul>")
    html_parts.append("<li>Section: the name of the section in the questionnaire</li>")
    html_parts.append("<li>Question: the question asked</li>")
    html_parts.append("<li>Answer: the answer</li>")
    html_parts.append("<li>Impact value: a number from 0 to 1 that indicates how favorable the answer to this question is in the context of obtaining a settlement, with 0 being very unfavorable, 0.5 neutral, and 1 being very favorable. This field is optional and a value of 0.5 indicates that the lawyer did not provide a value, possibly expressing an opinion of neutrality</li>")
    html_parts.append("<li>Impact reason: the reason why the impact value is the one selected by the lawyer. This field is optional</li>")
    html_parts.append("</ul>")
    html_parts.append("</ul>")

    data = load_questionnaire()
    if isinstance(data, tuple):
        data = data[0]
    headers = ['Section','Question','Answer','Impact Value','Impact Reason'] #section title, label, answer, and text with an explanation of impact
    dataset = [] # list of lists
    for section in data.get("sections", []):
        
        # for each question in the section
        for q in section.get("questions", []):
            curq = []
            curq.append(f"{section['title']}")
            qid = str(q.get("id"))
            if qid not in answers:
                continue # exclude the empty answers from the table

            curq.append(f"{q['label']}") #Question
            curq.append(f'{answers[qid]}') #Answer

            if "slider" in q and f"{qid}_slider" in answers:
                slider_val = float(answers.get(f"{qid}_slider"))
                curq.append(slider_val) #Impact Value
            else:
                curq.append(0.5)
            
            explanation = answers.get(f"{qid}_explanation")
            if explanation:
                curq.append(f"{explanation}") # Impact reason
            else:
                curq.append('')
            
            dataset.append(curq)
            

    df = pd.DataFrame(columns=headers,data=dataset) 
    html_parts.append(df.to_html(index=False))
    html_parts.append("Your output should be: ")
    html_parts.append("<ol>") 
    html_parts.append("<li>Summary of the case and assessment with citations to prior cases</li>")
    html_parts.append("<li>Which statutes is this claim under, which common law cases is it under</li>")
    html_parts.append("<li>Listing the weaknesses and strengths</li>")
    html_parts.append("<li>Breakdown of the computation of the damages</li>")
    html_parts.append("<li>Settlement recommendation</li>")
    html_parts.append("<li>What court or agency (eg, human right agency)</li>")
    html_parts.append("</ol>")
    html_parts.append("IMPORTANT: Just produce the document, without anything else, like \"certainly! Here it is\" etc")
    return "\n".join(html_parts)

def compile_summary2(answers):
    data = load_questionnaire()
    if isinstance(data, tuple):
        data = data[0]
    html_parts = []
    for section in data.get("sections", []):
        html_parts.append(f"<h3>{section['title']}</h3>")
        html_parts.append("<ul>")
        for q in section.get("questions", []):
            qid = str(q.get("id"))
            value = answers.get(qid, "")
            html_parts.append(f"<li><strong>{q['label']}:</strong> {value}</li>")
            if q.get("slider"):
                s_val = answers.get(f"{qid}_slider")
                if s_val is not None:
                    html_parts.append(f"<li>Impact: {s_val}</li>")
                explanation = answers.get(f"{qid}_explanation")
                if explanation:
                    html_parts.append(f"<li>Explanation: {explanation}</li>")
        html_parts.append("</ul>")
    return "\n".join(html_parts)

@app.route("/api/questions", methods=["GET"])
def get_questions():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(load_questionnaire())


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    hashed = USERS.get(username)
    if hashed and check_password_hash(hashed, password):
        session["user"] = username
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid credentials"}), 401


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if username in USERS:
        return jsonify({"error": "User already exists"}), 400
    USERS[username] = generate_password_hash(password)
    save_users(USERS)
    os.makedirs(os.path.join(USER_DATA_DIR, username), exist_ok=True)
    session["user"] = username
    return jsonify({"success": True})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"success": True})


@app.route("/api/check_login", methods=["GET"])
def check_login():
    return jsonify({"logged_in": "user" in session, "user": session.get("user")})

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({"debug": app.config.get("DEBUG", False)})


@app.route("/api/compile_summary", methods=["POST"])
def compile_summary_route():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    answers = data.get("answers", {})
    html = compile_summary(answers, session.get("user"))
    global LAST_SUMMARY
    LAST_SUMMARY = html
    return jsonify({"html": html})


@app.route("/api/chat", methods=["POST"])
def chat():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    messages = data.get("messages", [])
    global LAST_SUMMARY
    if not messages and LAST_SUMMARY:
        messages = [{"role": "user", "content": LAST_SUMMARY}]
    try:
        completion = client.chat.completions.create(
            model="gpt-4.1",
            messages=messages,
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/profile", methods=["GET"])
def get_profile():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    user_dir = os.path.join(USER_DATA_DIR, session["user"])
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, "profile.txt")
    try:
        download_cs_file(BUCKET_NAME, f"{GCS_PREFIX}/user_data/{session['user']}/profile.txt", file_path)
    except Exception:
        pass
    profile_text = ""
    if os.path.exists(file_path):
        with open(file_path) as f:
            profile_text = f.read()
    return jsonify({"profile": profile_text})


@app.route("/api/profile", methods=["POST"])
def save_profile():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    text = data.get("profile", "")
    user_dir = os.path.join(USER_DATA_DIR, session["user"])
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, "profile.txt")
    with open(file_path, "w") as f:
        f.write(text)
    try:
        upload_cs_file(BUCKET_NAME, file_path, f"{GCS_PREFIX}/user_data/{session['user']}/profile.txt")
    except Exception:
        pass
    return jsonify({"success": True})


@app.route("/api/save_answers", methods=["POST"])
def save_answers():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    filename = data.get("filename")
    answers = data.get("answers", {})
    client_info = data.get("clientInfo")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
    user_dir = os.path.join(USER_DATA_DIR, session["user"])
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, f"{filename}.json")
    # Save both answers and client info
    save_data = {
        "answers": answers,
        "clientInfo": client_info
    }
    with open(file_path, "w") as f:
        json.dump(save_data, f)
    try:
        upload_cs_file(BUCKET_NAME, file_path, f"{GCS_PREFIX}/user_data/{session['user']}/{filename}.json")
    except Exception:
        pass
    return jsonify({"success": True})


@app.route("/api/list_answers", methods=["GET"])
def list_answers():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    prefix = f"{GCS_PREFIX}/user_data/{session['user']}/"
    try:
        all_files = list_cs_files(BUCKET_NAME)
    except Exception:
        all_files = []
    files = [os.path.splitext(os.path.basename(f))[0] for f in all_files if f.startswith(prefix)]
    return jsonify({"files": files})


@app.route("/api/load_answers", methods=["GET"])
def load_answers():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
    user_dir = os.path.join(USER_DATA_DIR, session["user"])
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, f"{filename}.json")
    try:
        download_cs_file(BUCKET_NAME, f"{GCS_PREFIX}/user_data/{session['user']}/{filename}.json", file_path)
    except Exception:
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
    with open(file_path) as f:
        data = json.load(f)
    # Handle both old format (just answers) and new format (with clientInfo)
    if isinstance(data, dict) and "answers" in data:
        return jsonify({
            "answers": data.get("answers", {}),
            "clientInfo": data.get("clientInfo")
        })
    else:
        # Old format - just answers
        return jsonify({
            "answers": data,
            "clientInfo": None
        })


@app.route("/api/delete_answers", methods=["POST"])
def delete_answers():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
    user_dir = os.path.join(USER_DATA_DIR, session["user"])
    file_path = os.path.join(user_dir, f"{filename}.json")
    try:
        delete_cs_file(BUCKET_NAME, f"{GCS_PREFIX}/user_data/{session['user']}/{filename}.json")
    except Exception:
        pass
    if os.path.exists(file_path):
        os.remove(file_path)
    return jsonify({"success": True})

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    static_folder = os.path.join(os.getcwd(), "client", "dist")
    file_path = os.path.join(static_folder, path)

    if path != "" and os.path.exists(file_path):
        return send_from_directory(static_folder, path)
    elif os.path.exists(os.path.join(static_folder, "index.html")):
        return send_from_directory(static_folder, "index.html")
    else:
        return "React frontend not found. Did you run 'npm run build'?", 404

@app.errorhandler(404)
def handle_404(e):
    return serve_react("")

# extra comment
if __name__ == "__main__":
    #app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
    app.run(host="0.0.0.0", port=5001) # local
