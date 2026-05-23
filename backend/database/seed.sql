PRAGMA foreign_keys = ON;

INSERT INTO trainers (full_name, email, password_hash, role)
VALUES 
('Formateur Principal', 'formateur@example.com', '123456', 'trainer');

INSERT INTO modules (name, description)
VALUES 
('API REST', 'Module sur les API REST et les architectures web modernes'),
('Java', 'Module Java pour Licence 3'),
('Middleware', 'Module RMI et Web Services');

INSERT INTO students (matricule, first_name, last_name, secret_code, is_active)
VALUES
('ETU001', 'Awa', 'Diop', '1111', 1),
('ETU002', 'Moussa', 'Fall', '2222', 1),
('ETU003', 'Fatou', 'Ndiaye', '3333', 1),
('ETU004', 'Ibrahima', 'Ba', '4444', 1),
('ETU005', 'Mariama', 'Sow', '5555', 1);

INSERT INTO exams (
    module_id,
    trainer_id,
    title,
    description,
    duration_minutes,
    number_of_questions,
    success_percentage,
    random_questions,
    random_answers,
    is_published
)
VALUES (
    1,
    1,
    'Examen API REST - Niveau 1',
    'QCM sur les bases des API REST',
    30,
    5,
    60,
    1,
    1,
    1
);

INSERT INTO questions (exam_id, question_text, question_type, points)
VALUES
(1, 'Que signifie API ?', 'single_choice', 1),
(1, 'Quel format est souvent utilisé dans une API REST ?', 'single_choice', 1),
(1, 'Quelle méthode HTTP permet de récupérer des données ?', 'single_choice', 1),
(1, 'Quelle méthode HTTP permet généralement de créer une ressource ?', 'single_choice', 1),
(1, 'Quel code HTTP signifie succès ?', 'single_choice', 1),
(1, 'Quel code HTTP signifie ressource introuvable ?', 'single_choice', 1),
(1, 'Quel outil peut être utilisé pour tester une API ?', 'single_choice', 1),
(1, 'Dans une API REST, que représente une route ?', 'single_choice', 1);

INSERT INTO answers (question_id, answer_text, is_correct)
VALUES
(1, 'Application Programming Interface', 1),
(1, 'Advanced Program Internet', 0),
(1, 'Application Private Interface', 0),
(1, 'Automatic Protocol Interface', 0),

(2, 'JSON', 1),
(2, 'MP3', 0),
(2, 'PNG', 0),
(2, 'DOCX', 0),

(3, 'GET', 1),
(3, 'POST', 0),
(3, 'PUT', 0),
(3, 'DELETE', 0),

(4, 'POST', 1),
(4, 'GET', 0),
(4, 'PATCH', 0),
(4, 'OPTIONS', 0),

(5, '200', 1),
(5, '404', 0),
(5, '500', 0),
(5, '301', 0),

(6, '404', 1),
(6, '200', 0),
(6, '201', 0),
(6, '500', 0),

(7, 'Postman', 1),
(7, 'Photoshop', 0),
(7, 'Excel', 0),
(7, 'VLC', 0),

(8, 'Une URL qui permet d’accéder à une ressource ou une action', 1),
(8, 'Un fichier image', 0),
(8, 'Un mot de passe', 0),
(8, 'Une base de données complète', 0);