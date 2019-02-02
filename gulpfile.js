const gulp = require("gulp");

const settings = {
  copy: {
    files: ["./*.md", "./LICENSE", "package.json"],
  },
  watch: {
    files: ["src/**/*.ts"],
  },
  base: "./",
};

gulp.task("copy", function() {
  return gulp.src(settings.copy.files).pipe(gulp.dest("lib"));
});

gulp.task("watch", function() {
  return gulp.watch(settings.watch.files, function(obj) {
    if (obj.type === "changed") {
      gulp.src(obj.path).pipe(gulp.dest("lib"));
    }
  });
});
