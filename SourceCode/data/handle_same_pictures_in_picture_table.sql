SELECT label, count(type_id) FROM picture_2 JOIN type USING(type_id) GROUP BY type_id;

CREATE TABLE picture_2 (
    type_id        INTEGER NOT NULL,
    pic_data       BLOB    NOT NULL,
    username       INTEGER NOT NULL,
    trainings_data BOOLEAN NOT NULL
                           DEFAULT TRUE
);

INSERT INTO picture_2
SELECT * FROM picture GROUP BY pic_data;

DROP TABLE picture;

ALTER TABLE picture_2 RENAME TO picture;