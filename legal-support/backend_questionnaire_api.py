"""
Add this to your app.py file
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import json

app = Flask(__name__)
CORS(app)

# Path to questionnaires folder
QUESTIONNAIRES_PATH = os.path.join(os.path.dirname(__file__), 'questionnaires')

@app.route('/api/questionnaires', methods=['GET'])
def get_questionnaires():
    """Get list of available questionnaires"""
    try:
        questionnaires = []
        for folder in os.listdir(QUESTIONNAIRES_PATH):
            folder_path = os.path.join(QUESTIONNAIRES_PATH, folder)
            if os.path.isdir(folder_path):
                # Check if questions.xlsx exists
                excel_path = os.path.join(folder_path, 'questions.xlsx')
                if os.path.exists(excel_path):
                    questionnaires.append({
                        'id': folder.lower().replace(' ', '_'),
                        'name': folder.replace('_', ' ').title(),
                        'path': folder
                    })
        return jsonify({
            'success': True,
            'questionnaires': questionnaires
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/questionnaire/<questionnaire_type>', methods=['GET'])
def get_questionnaire(questionnaire_type):
    """Get questions from a specific questionnaire Excel file"""
    try:
        # Map the questionnaire type to folder name
        folder_name = questionnaire_type.replace('_', ' ').title()
        
        # Try different possible folder names
        possible_paths = [
            os.path.join(QUESTIONNAIRES_PATH, questionnaire_type, 'questions.xlsx'),
            os.path.join(QUESTIONNAIRES_PATH, folder_name, 'questions.xlsx'),
            os.path.join(QUESTIONNAIRES_PATH, questionnaire_type.replace('_', ' ') + ' case', 'questions.xlsx'),
            os.path.join(QUESTIONNAIRES_PATH, 'Discrimination case', 'questions.xlsx'),
            os.path.join(QUESTIONNAIRES_PATH, 'Personal injury case', 'questions.xlsx'),
        ]
        
        excel_path = None
        for path in possible_paths:
            if os.path.exists(path):
                excel_path = path
                break
        
        if not excel_path:
            return jsonify({
                'success': False,
                'error': f'Questionnaire not found: {questionnaire_type}'
            }), 404
        
        # Read the Excel file
        df = pd.read_excel(excel_path)
        
        # Group questions by section
        sections = {}
        questions = []
        
        for index, row in df.iterrows():
            # Skip empty rows
            if pd.isna(row.get('Question number')) and pd.isna(row.get('Label')):
                continue
                
            # Extract data from Excel columns
            question_number = row.get('Question number')
            section = row.get('Section', '')
            question_id = row.get('Id', f'q_{index}')
            label = row.get('Label', '')
            question_type = row.get('Type', 'Short text')
            parameters = row.get('Parameters', '')
            conditional_on = row.get('Conditional on question', '')
            mandatory = row.get('Mandatory', 'Yes')
            needs_slider = row.get('Needs a slider', 'Yes')
            default_slider_value = row.get('Default value of slider', 0.5)
            
            # Parse conditional logic
            conditional_question_id = None
            conditional_value = None
            if pd.notna(conditional_on) and str(conditional_on).strip():
                # Format: "question_id,'value'" or just "question_id"
                conditional_str = str(conditional_on).strip()
                if ',' in conditional_str:
                    parts = conditional_str.split(',')
                    conditional_question_id = parts[0].strip()
                    conditional_value = parts[1].strip().strip("'\"")
                else:
                    conditional_question_id = conditional_str
            
            # Parse parameters for Multiple Choice
            options = []
            if pd.notna(parameters) and str(parameters).strip():
                param_str = str(parameters).strip()
                # Check if it's a list format
                if param_str.startswith('[') and param_str.endswith(']'):
                    try:
                        options = json.loads(param_str.replace("'", '"'))
                    except:
                        options = []
            
            # Determine if this is a display-only label
            is_label = str(question_type).lower() == 'label'
            
            # Build question object
            question = {
                'id': str(question_id) if pd.notna(question_id) else f'q_{index}',
                'questionNumber': int(question_number) if pd.notna(question_number) else None,
                'section': int(section) if pd.notna(section) else None,
                'label': str(label) if pd.notna(label) else '',
                'type': str(question_type).lower() if pd.notna(question_type) else 'short text',
                'parameters': str(parameters) if pd.notna(parameters) else '',
                'options': options,
                'conditionalQuestionId': conditional_question_id,
                'conditionalValue': conditional_value,
                'mandatory': str(mandatory).lower() in ['yes', 'true', '1'] if pd.notna(mandatory) else False,
                'needsSlider': str(needs_slider).lower() in ['yes', 'true', '1'] if pd.notna(needs_slider) else False,
                'defaultSliderValue': float(default_slider_value) if pd.notna(default_slider_value) else 0.5,
                'isLabel': is_label,
                'answer': '',
                'severity': float(default_slider_value) if pd.notna(default_slider_value) else 0.5
            }
            
            questions.append(question)
            
            # Group by section
            section_key = int(section) if pd.notna(section) else 0
            if section_key not in sections:
                sections[section_key] = []
            sections[section_key].append(question)
        
        return jsonify({
            'success': True,
            'questionnaire_type': questionnaire_type,
            'questions': questions,
            'sections': sections
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/submit-assessment', methods=['POST'])
def submit_assessment():
    """Submit completed case assessment"""
    try:
        data = request.json
        questionnaire_type = data.get('questionnaire_type')
        answers = data.get('answers')
        
        # Here you would save to database or process the data
        # For now, just return success
        
        print(f"Received assessment for: {questionnaire_type}")
        print(f"Number of answers: {len(answers)}")
        
        # Calculate some basic statistics
        completed = sum(1 for a in answers.values() if a.get('answer'))
        total = len(answers)
        
        return jsonify({
            'success': True,
            'message': 'Assessment submitted successfully',
            'assessment_id': 'ASSESS-' + str(abs(hash(str(answers))))[:8],
            'stats': {
                'completed': completed,
                'total': total,
                'completion_rate': round((completed / total * 100), 1) if total > 0 else 0
            }
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
