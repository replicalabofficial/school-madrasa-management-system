window.studentExport = {

    exportExcel: function (students) {

        if (!students || students.length === 0) {
            alert("There are no students to export.");
            return;
        }

        const rows = students.map(student => ({

            "Student Name": student.student,

            "Guardian": student.guardian,

            "Phone": student.phone,

            "Class": student.class,

            "Branch": student.branch,

            "Monthly Fee": student.monthlyFee,

            "Admission Date": student.admissionDate,

            "Status": student.status

        }));


        const worksheet =
            XLSX.utils.json_to_sheet(rows);


        worksheet["!cols"] = [

            { wch: 24 },

            { wch: 22 },

            { wch: 17 },

            { wch: 14 },

            { wch: 14 },

            { wch: 16 },

            { wch: 18 },

            { wch: 12 }

        ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Students"
        );


        XLSX.writeFile(
            workbook,
            "Students.xlsx"
        );

    }

};